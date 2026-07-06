// Description: Native LiveKit Swift media view for iOS live streams.
import AVFoundation
import LiveKit
import React
import UIKit

private let liveDebugPrefix = "[VNSEEA_CALL_DEBUG]"

private enum NativeLiveRole: String {
  case host
  case viewer
}

@objc(VNSEEALiveKitNativeView)
class VNSEEALiveKitNativeView: UIView, RoomDelegate, @unchecked Sendable {
  @objc var serverUrl: NSString? { didSet { syncConnectionStateOnMain() } }
  @objc var token: NSString? { didSet { syncConnectionStateOnMain() } }
  @objc var roomName: NSString? { didSet { syncConnectionStateOnMain() } }
  @objc var streamName: NSString? { didSet { syncConnectionStateOnMain() } }
  @objc var liveRole: NSString? { didSet { syncConnectionStateOnMain() } }
  @objc var cameraFacing: NSString? { didSet { applyCameraFacingOnMain() } }
  @objc var connect: Bool = false { didSet { syncConnectionStateOnMain() } }
  @objc var onLiveNativeEvent: RCTBubblingEventBlock?

  private let videoView = VideoView()
  private var room: Room?
  private var connectTask: Task<Void, Never>?
  private var currentConnectionKey: String?
  private var latestCameraPosition: AVCaptureDevice.Position = .front

  override init(frame: CGRect) {
    super.init(frame: frame)
    backgroundColor = .black
    videoView.translatesAutoresizingMaskIntoConstraints = false
    videoView.layoutMode = .fill
    videoView.mirrorMode = .auto
    addSubview(videoView)
    NSLayoutConstraint.activate([
      videoView.leadingAnchor.constraint(equalTo: leadingAnchor),
      videoView.trailingAnchor.constraint(equalTo: trailingAnchor),
      videoView.topAnchor.constraint(equalTo: topAnchor),
      videoView.bottomAnchor.constraint(equalTo: bottomAnchor),
    ])
  }

  required init?(coder: NSCoder) {
    return nil
  }

  deinit {
    connectTask?.cancel()
    if let room {
      Task {
        await room.disconnect()
      }
    }
  }

  private func syncConnectionStateOnMain() {
    if Thread.isMainThread {
      syncConnectionState()
      return
    }
    DispatchQueue.main.async { [weak self] in
      self?.syncConnectionState()
    }
  }

  private func applyCameraFacingOnMain() {
    if Thread.isMainThread {
      applyCameraFacing()
      return
    }
    DispatchQueue.main.async { [weak self] in
      self?.applyCameraFacing()
    }
  }

  private func syncConnectionState() {
    guard connect else {
      disconnectLiveKit(reason: "connect_false")
      return
    }
    guard
      let url = stringValue(serverUrl), !url.isEmpty,
      let token = stringValue(token), !token.isEmpty,
      let roomName = stringValue(roomName), !roomName.isEmpty
    else {
      return
    }

    let streamName = stringValue(streamName) ?? ""
    let nativeRole = NativeLiveRole(rawValue: (stringValue(liveRole) ?? "viewer").lowercased()) ?? .viewer
    let cameraPosition = cameraPosition(from: stringValue(cameraFacing))
    latestCameraPosition = cameraPosition
    let connectionKey = [
      url,
      token,
      roomName,
      streamName,
      nativeRole.rawValue,
    ].joined(separator: "|")

    guard currentConnectionKey != connectionKey else {
      applyCameraFacing()
      return
    }

    disconnectLiveKit(reason: "replace_connection")
    connectLiveKit(
      url: url,
      token: token,
      roomName: roomName,
      streamName: streamName,
      role: nativeRole,
      cameraPosition: cameraPosition,
      connectionKey: connectionKey
    )
  }

  private func connectLiveKit(
    url: String,
    token: String,
    roomName: String,
    streamName: String,
    role: NativeLiveRole,
    cameraPosition: AVCaptureDevice.Position,
    connectionKey: String
  ) {
    let roomOptions = RoomOptions(
      defaultCameraCaptureOptions: CameraCaptureOptions(
        position: cameraPosition,
        dimensions: .h720_169,
        fps: 30
      ),
      adaptiveStream: true,
      dynacast: true,
      reportRemoteTrackStatistics: true
    )
    let connectOptions = ConnectOptions(autoSubscribe: true)
    let nextRoom = Room(delegate: self,
      connectOptions: connectOptions,
      roomOptions: roomOptions
    )

    currentConnectionKey = connectionKey
    room = nextRoom
    videoView.mirrorMode = role == .host && cameraPosition == .front ? .mirror : .off
    emit("live_native_room_connect_start", [
      "role": role.rawValue,
      "roomName": roomName,
      "streamName": streamName,
      "tokenLength": token.count,
      "autoSubscribe": true,
    ])

    connectTask = Task { [weak self, weak nextRoom] in
      guard let self, let nextRoom else { return }
      do {
        try await nextRoom.connect(
          url: url,
          token: token,
          connectOptions: connectOptions,
          roomOptions: roomOptions
        )

        guard !Task.isCancelled else { return }
        if role == .host {
          let microphonePublication = try await nextRoom.localParticipant.setMicrophone(enabled: true)
          self.emitPublication(
            "live_native_track_published",
            publication: microphonePublication,
            participant: nextRoom.localParticipant,
            role: role
          )
          let cameraPublication = try await nextRoom.localParticipant.setCamera(enabled: true,
            captureOptions: CameraCaptureOptions(
              position: cameraPosition,
              dimensions: .h720_169,
              fps: 30
            )
          )
          self.emitPublication(
            "live_native_track_published",
            publication: cameraPublication,
            participant: nextRoom.localParticipant,
            role: role
          )
          self.attachVideoPublication(cameraPublication, isLocal: true)
        } else {
          self.attachPreferredRemoteVideoTrack(in: nextRoom)
        }
      } catch {
        self.emit("live_native_error", [
          "role": role.rawValue,
          "roomName": roomName,
          "streamName": streamName,
          "message": error.localizedDescription,
        ])
      }
    }
  }

  private func disconnectLiveKit(reason: String) {
    connectTask?.cancel()
    connectTask = nil
    currentConnectionKey = nil
    videoView.track = nil

    guard let currentRoom = room else { return }
    room = nil
    emit("live_native_room_disconnected", [
      "reason": reason,
      "roomName": stringValue(roomName) ?? "",
      "streamName": stringValue(streamName) ?? "",
      "role": stringValue(liveRole) ?? "",
    ])
    Task {
      await currentRoom.disconnect()
    }
  }

  private func applyCameraFacing() {
    latestCameraPosition = cameraPosition(from: stringValue(cameraFacing))
    guard
      (stringValue(liveRole) ?? "viewer").lowercased() == NativeLiveRole.host.rawValue,
      let cameraTrack = room?.localParticipant.firstCameraVideoTrack as? LocalVideoTrack,
      let cameraCapturer = cameraTrack.capturer as? CameraCapturer
    else {
      return
    }

    videoView.mirrorMode = latestCameraPosition == .front ? .mirror : .off
    Task { [weak self] in
      do {
        try await cameraCapturer.set(cameraPosition: self?.latestCameraPosition ?? .front)
        self?.emit("live_native_camera_switched", [
          "cameraFacing": self?.cameraFacingString ?? "",
        ])
      } catch {
        self?.emit("live_native_error", [
          "message": error.localizedDescription,
          "stage": "camera_switch",
        ])
      }
    }
  }

  private func attachPreferredRemoteVideoTrack(in room: Room) {
    for participant in room.remoteParticipants.values {
      if let videoTrack = participant.firstCameraVideoTrack {
        attachVideoTrack(videoTrack, isLocal: false)
        return
      }
    }
  }

  private func attachVideoPublication(_ publication: TrackPublication?, isLocal: Bool) {
    guard let track = publication?.track as? VideoTrack else { return }
    attachVideoTrack(track, isLocal: isLocal)
  }

  private func attachVideoTrack(_ track: VideoTrack, isLocal: Bool) {
    DispatchQueue.main.async { [weak self] in
      guard let self else { return }
      self.videoView.mirrorMode = isLocal && self.latestCameraPosition == .front ? .mirror : .off
      self.videoView.track = track
    }
  }

  private func emitPublication(
    _ event: String,
    publication: TrackPublication?,
    participant: Participant?,
    role: NativeLiveRole
  ) {
    guard let publication else { return }
    emit(event, [
      "role": role.rawValue,
      "trackKind": kindString(publication.kind),
      "trackSource": sourceString(publication.source),
      "trackSid": publication.sid.stringValue,
      "muted": publication.isMuted,
      "isSubscribed": publication.isSubscribed,
      "participantIdentity": participant?.identity?.stringValue ?? "",
      "participantSid": participant?.sid?.stringValue ?? "",
      "participantName": participant?.name ?? "",
    ])
  }

  private func emit(_ event: String, _ payload: [String: Any]) {
    var nextPayload = payload
    nextPayload["event"] = event
    nextPayload["at"] = ISO8601DateFormatter().string(from: Date())
    logNativePayload(nextPayload)
    DispatchQueue.main.async { [weak self] in
      self?.onLiveNativeEvent?(nextPayload)
    }
  }

  private func logNativePayload(_ payload: [String: Any]) {
    guard
      JSONSerialization.isValidJSONObject(payload),
      let data = try? JSONSerialization.data(withJSONObject: payload),
      let text = String(data: data, encoding: .utf8)
    else {
      NSLog("%@ %@", liveDebugPrefix, String(describing: payload))
      return
    }
    NSLog("%@ %@", liveDebugPrefix, text)
  }

  private var cameraFacingString: String {
    latestCameraPosition == .front ? "front" : "back"
  }

  private func stringValue(_ value: NSString?) -> String? {
    value as String?
  }

  private func cameraPosition(from value: String?) -> AVCaptureDevice.Position {
    value?.lowercased() == "back" ? .back : .front
  }

  private func kindString(_ kind: Track.Kind) -> String {
    switch kind {
    case .audio:
      return "audio"
    case .video:
      return "video"
    case .none:
      return "none"
    @unknown default:
      return "unknown"
    }
  }

  private func sourceString(_ source: Track.Source) -> String {
    switch source {
    case .camera:
      return "camera"
    case .microphone:
      return "microphone"
    case .screenShareVideo:
      return "screen_share_video"
    case .screenShareAudio:
      return "screen_share_audio"
    case .unknown:
      return "unknown"
    @unknown default:
      return "unknown"
    }
  }

  func roomDidConnect(_ room: Room) {
    emit("live_native_room_connected", [
      "roomName": stringValue(roomName) ?? "",
      "streamName": stringValue(streamName) ?? "",
      "role": stringValue(liveRole) ?? "",
      "roomSid": room.sid?.stringValue ?? "",
    ])
  }

  func room(_ room: Room, didDisconnectWithError error: LiveKitError?) {
    emit("live_native_room_disconnected", [
      "roomName": stringValue(roomName) ?? "",
      "streamName": stringValue(streamName) ?? "",
      "role": stringValue(liveRole) ?? "",
      "message": error?.localizedDescription ?? "",
    ])
  }

  func room(_ room: Room, didFailToConnectWithError error: LiveKitError?) {
    emit("live_native_error", [
      "roomName": stringValue(roomName) ?? "",
      "streamName": stringValue(streamName) ?? "",
      "role": stringValue(liveRole) ?? "",
      "message": error?.localizedDescription ?? "Failed to connect",
    ])
  }

  func room(_ room: Room, participant: LocalParticipant, didPublishTrack publication: LocalTrackPublication) {
    emitPublication("live_native_track_published", publication: publication, participant: participant, role: .host)
    if publication.source == .camera {
      attachVideoPublication(publication, isLocal: true)
    }
  }

  func room(_ room: Room, participant: RemoteParticipant, didPublishTrack publication: RemoteTrackPublication) {
    emitPublication("live_native_track_published", publication: publication, participant: participant, role: .viewer)
  }

  func room(_ room: Room, participant: RemoteParticipant, didSubscribeTrack publication: RemoteTrackPublication) {
    emitPublication("live_native_track_subscribed", publication: publication, participant: participant, role: .viewer)
    if publication.source == .camera {
      attachVideoPublication(publication, isLocal: false)
    }
  }
}

@objc(VNSEEALiveKitNativeViewManager)
class VNSEEALiveKitNativeViewManager: RCTViewManager {
  override static func requiresMainQueueSetup() -> Bool {
    true
  }

  override func view() -> UIView! {
    VNSEEALiveKitNativeView()
  }
}
