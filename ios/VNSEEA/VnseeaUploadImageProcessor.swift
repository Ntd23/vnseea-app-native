// Description: Downscales picked images with ImageIO before upload, applying EXIF orientation off the main thread.
import Foundation
import ImageIO
import React
import UniformTypeIdentifiers

@objc(VnseeaUploadImageProcessor)
class VnseeaUploadImageProcessor: NSObject {
  private static let outputDirectoryName = "vnseea-upload-images"
  private static let outputMaxAge: TimeInterval = 24 * 60 * 60
  private static var didCleanOutputDirectory = false
  private static let cleanupLock = NSLock()

  private let queue = DispatchQueue(
    label: "vn.vnseea.upload-image-processor",
    qos: .userInitiated,
    attributes: .concurrent
  )

  static func moduleName() -> String! {
    "VnseeaUploadImageProcessor"
  }

  static func requiresMainQueueSetup() -> Bool {
    false
  }

  @objc
  func prepare(
    _ uriValue: String,
    options: NSDictionary,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    queue.async {
      autoreleasepool {
        do {
          resolve(try Self.prepareImage(uriValue: uriValue, options: options))
        } catch {
          reject(
            "E_UPLOAD_IMAGE_PREPARE",
            "Could not prepare the image for upload.",
            error
          )
        }
      }
    }
  }

  private static func prepareImage(
    uriValue: String,
    options: NSDictionary
  ) throws -> [String: Any] {
    let maxDimension = max(320, (options["maxDimension"] as? NSNumber)?.intValue ?? 2048)
    let quality = min(max((options["quality"] as? NSNumber)?.doubleValue ?? 0.8, 0.1), 1)
    let passthroughMaxBytes = (options["passthroughMaxBytes"] as? NSNumber)?.int64Value ?? 0

    guard let sourceURL = fileURL(from: uriValue) else {
      throw processorError("The image URI is not a local file.")
    }
    guard
      let source = CGImageSourceCreateWithURL(
        sourceURL as CFURL,
        [kCGImageSourceShouldCache: false] as CFDictionary
      ),
      CGImageSourceGetCount(source) > 0
    else {
      throw processorError("The image could not be opened.")
    }

    let properties =
      CGImageSourceCopyPropertiesAtIndex(source, 0, nil) as? [CFString: Any] ?? [:]
    let pixelWidth = (properties[kCGImagePropertyPixelWidth] as? NSNumber)?.intValue ?? 0
    let pixelHeight = (properties[kCGImagePropertyPixelHeight] as? NSNumber)?.intValue ?? 0
    guard pixelWidth > 0, pixelHeight > 0 else {
      throw processorError("The image has invalid dimensions.")
    }

    let orientation = (properties[kCGImagePropertyOrientation] as? NSNumber)?.intValue ?? 1
    let swapsAxes = (5...8).contains(orientation)
    let orientedWidth = swapsAxes ? pixelHeight : pixelWidth
    let orientedHeight = swapsAxes ? pixelWidth : pixelHeight
    let largestSide = max(orientedWidth, orientedHeight)

    let sourceType = (CGImageSourceGetType(source) as String?) ?? UTType.jpeg.identifier
    let isJpeg = sourceType == UTType.jpeg.identifier
    let isPng = sourceType == UTType.png.identifier
    let fileSize = fileSizeInBytes(sourceURL)

    // Small JPEG/PNG files are already cheap to upload; re-encoding them would
    // only cost time and quality.
    if largestSide <= maxDimension,
      isJpeg || isPng,
      fileSize > 0,
      fileSize <= passthroughMaxBytes
    {
      return [
        "uri": sourceURL.absoluteString,
        "width": orientedWidth,
        "height": orientedHeight,
        "fileName": sourceURL.lastPathComponent,
        "type": isPng ? "image/png" : "image/jpeg",
        "fileSize": fileSize,
        "transformed": false,
      ]
    }

    // ImageIO decodes straight into the target size and applies the EXIF
    // orientation, so the full-resolution bitmap is never materialized.
    let thumbnailOptions: [CFString: Any] = [
      kCGImageSourceCreateThumbnailFromImageAlways: true,
      kCGImageSourceCreateThumbnailWithTransform: true,
      kCGImageSourceShouldCacheImmediately: true,
      kCGImageSourceThumbnailMaxPixelSize: min(maxDimension, largestSide),
    ]
    guard
      let image = CGImageSourceCreateThumbnailAtIndex(
        source,
        0,
        thumbnailOptions as CFDictionary
      )
    else {
      throw processorError("The image could not be decoded.")
    }

    let hasAlpha = (properties[kCGImagePropertyHasAlpha] as? NSNumber)?.boolValue ?? false
    let keepsTransparency = isPng && hasAlpha
    let outputType = keepsTransparency ? UTType.png : UTType.jpeg
    let outputExtension = keepsTransparency ? "png" : "jpg"
    let outputURL = try makeOutputURL(fileExtension: outputExtension)

    guard
      let destination = CGImageDestinationCreateWithURL(
        outputURL as CFURL,
        outputType.identifier as CFString,
        1,
        nil
      )
    else {
      throw processorError("The output image could not be created.")
    }
    // No source metadata is copied: the pixels are already upright, and a
    // copied Orientation tag would rotate the image a second time.
    CGImageDestinationAddImage(
      destination,
      image,
      [kCGImageDestinationLossyCompressionQuality: quality] as CFDictionary
    )
    guard CGImageDestinationFinalize(destination) else {
      try? FileManager.default.removeItem(at: outputURL)
      throw processorError("The output image could not be written.")
    }

    return [
      "uri": outputURL.absoluteString,
      "width": image.width,
      "height": image.height,
      "fileName": outputURL.lastPathComponent,
      "type": keepsTransparency ? "image/png" : "image/jpeg",
      "fileSize": fileSizeInBytes(outputURL),
      "transformed": true,
    ]
  }

  private static func fileURL(from value: String) -> URL? {
    if value.hasPrefix("file://") {
      if let url = URL(string: value), url.isFileURL {
        return url
      }
      let path = String(value.dropFirst("file://".count))
      return URL(fileURLWithPath: path.removingPercentEncoding ?? path)
    }
    if value.hasPrefix("/") {
      return URL(fileURLWithPath: value)
    }
    return nil
  }

  private static func fileSizeInBytes(_ url: URL) -> Int64 {
    let values = try? url.resourceValues(forKeys: [.fileSizeKey])
    return Int64(values?.fileSize ?? 0)
  }

  private static func makeOutputURL(fileExtension: String) throws -> URL {
    let directory = FileManager.default.temporaryDirectory
      .appendingPathComponent(outputDirectoryName, isDirectory: true)
    try FileManager.default.createDirectory(
      at: directory,
      withIntermediateDirectories: true
    )
    cleanOldOutputsOnce(in: directory)
    return directory.appendingPathComponent("\(UUID().uuidString).\(fileExtension)")
  }

  private static func cleanOldOutputsOnce(in directory: URL) {
    cleanupLock.lock()
    let shouldClean = !didCleanOutputDirectory
    didCleanOutputDirectory = true
    cleanupLock.unlock()
    guard shouldClean else { return }

    let expiry = Date().addingTimeInterval(-outputMaxAge)
    let files =
      (try? FileManager.default.contentsOfDirectory(
        at: directory,
        includingPropertiesForKeys: [.contentModificationDateKey]
      )) ?? []
    for file in files {
      let modifiedAt = (try? file.resourceValues(forKeys: [.contentModificationDateKey]))?
        .contentModificationDate
      if let modifiedAt, modifiedAt < expiry {
        try? FileManager.default.removeItem(at: file)
      }
    }
  }

  private static func processorError(_ message: String) -> NSError {
    NSError(
      domain: "VnseeaUploadImageProcessor",
      code: 1,
      userInfo: [NSLocalizedDescriptionKey: message]
    )
  }
}
