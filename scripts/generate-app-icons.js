const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const projectRoot = path.resolve(__dirname, '..');
const sourcePath = path.resolve(
  process.argv[2] || path.join(projectRoot, 'assets', 'icon-source-128.png'),
);

const androidRes = path.join(
  projectRoot,
  'android',
  'app',
  'src',
  'main',
  'res',
);
const iosIconDir = path.join(
  projectRoot,
  'ios',
  'VNSEEA',
  'Images.xcassets',
  'AppIcon.appiconset',
);

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function median(values) {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

function readPng(filePath) {
  return PNG.sync.read(fs.readFileSync(filePath));
}

function writePng(filePath, image, options = {}) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(
    filePath,
    PNG.sync.write(image, { inputColorType: 6, ...options }),
  );
}

function pixelAt(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return {
    r: image.data[offset],
    g: image.data[offset + 1],
    b: image.data[offset + 2],
    a: image.data[offset + 3],
  };
}

function estimateBackgroundRows(source) {
  const rawRows = Array.from({ length: source.height }, (_, y) => {
    const reds = [];
    const greens = [];
    const blues = [];

    for (let x = 0; x < source.width; x += 1) {
      const pixel = pixelAt(source, x, y);
      const looksLikeRedBackground =
        pixel.a > 220 &&
        pixel.r > 105 &&
        pixel.g < 125 &&
        pixel.b < 125 &&
        pixel.r - Math.max(pixel.g, pixel.b) > 55;

      if (!looksLikeRedBackground) continue;
      reds.push(pixel.r);
      greens.push(pixel.g);
      blues.push(pixel.b);
    }

    if (reds.length === 0) return null;
    return {
      r: median(reds),
      g: median(greens),
      b: median(blues),
    };
  });

  for (let y = 0; y < rawRows.length; y += 1) {
    if (rawRows[y]) continue;
    let above = y - 1;
    let below = y + 1;
    while (above >= 0 && !rawRows[above]) above -= 1;
    while (below < rawRows.length && !rawRows[below]) below += 1;

    if (above >= 0 && below < rawRows.length) {
      const ratio = (y - above) / (below - above);
      rawRows[y] = {
        r: rawRows[above].r + (rawRows[below].r - rawRows[above].r) * ratio,
        g: rawRows[above].g + (rawRows[below].g - rawRows[above].g) * ratio,
        b: rawRows[above].b + (rawRows[below].b - rawRows[above].b) * ratio,
      };
    } else {
      rawRows[y] = rawRows[above] ||
        rawRows[below] || {
          r: 185,
          g: 28,
          b: 28,
        };
    }
  }

  return rawRows.map((_, y) => {
    const samples = [];
    for (let offset = -4; offset <= 4; offset += 1) {
      const row = rawRows[clamp(y + offset, 0, rawRows.length - 1)];
      samples.push(row);
    }
    return {
      r: samples.reduce((sum, row) => sum + row.r, 0) / samples.length,
      g: samples.reduce((sum, row) => sum + row.g, 0) / samples.length,
      b: samples.reduce((sum, row) => sum + row.b, 0) / samples.length,
    };
  });
}

function extractLogoMask(source, backgroundRows) {
  const mask = new Float32Array(source.width * source.height);

  for (let y = 0; y < source.height; y += 1) {
    const background = backgroundRows[y];
    for (let x = 0; x < source.width; x += 1) {
      const pixel = pixelAt(source, x, y);
      if (pixel.a < 16) continue;

      const greenCoverage =
        (pixel.g - background.g) / Math.max(1, 255 - background.g);
      const blueCoverage =
        (pixel.b - background.b) / Math.max(1, 255 - background.b);
      const neutralCoverage = Math.min(greenCoverage, blueCoverage);
      const chroma =
        Math.max(pixel.r, pixel.g, pixel.b) -
        Math.min(pixel.r, pixel.g, pixel.b);
      const neutrality = clamp((95 - chroma) / 75);
      const sourceAlpha = pixel.a / 255;
      const coverage =
        clamp((neutralCoverage - 0.015) / 0.97) * neutrality * sourceAlpha;

      mask[y * source.width + x] = coverage;
    }
  }

  return mask;
}

function removeBorderArtifacts(mask, width, height, threshold = 0.1) {
  const visited = new Uint8Array(width * height);
  const keep = new Uint8Array(width * height);
  const neighbors = [
    [-1, -1],
    [0, -1],
    [1, -1],
    [-1, 0],
    [1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
  ];

  for (let startY = 0; startY < height; startY += 1) {
    for (let startX = 0; startX < width; startX += 1) {
      const startIndex = startY * width + startX;
      if (visited[startIndex] || mask[startIndex] <= threshold) continue;

      const queue = [startIndex];
      const component = [];
      visited[startIndex] = 1;
      let touchesBorder = false;

      while (queue.length > 0) {
        const index = queue.pop();
        const x = index % width;
        const y = Math.floor(index / width);
        component.push(index);
        touchesBorder ||=
          x === 0 || y === 0 || x === width - 1 || y === height - 1;

        for (const [dx, dy] of neighbors) {
          const nextX = x + dx;
          const nextY = y + dy;
          if (nextX < 0 || nextX >= width || nextY < 0 || nextY >= height) {
            continue;
          }
          const nextIndex = nextY * width + nextX;
          if (visited[nextIndex] || mask[nextIndex] <= threshold) continue;
          visited[nextIndex] = 1;
          queue.push(nextIndex);
        }
      }

      if (!touchesBorder && component.length >= 20) {
        for (const index of component) keep[index] = 1;
      }
    }
  }

  for (let index = 0; index < mask.length; index += 1) {
    if (!keep[index]) mask[index] = 0;
  }

  return mask;
}

function smoothstep(edge0, edge1, value) {
  const amount = clamp((value - edge0) / Math.max(1e-6, edge1 - edge0));
  return amount * amount * (3 - 2 * amount);
}

function smoothLogoMask(mask, width, height) {
  const kernel = [1, 4, 6, 4, 1];
  const kernelSum = 16;
  const horizontal = new Float32Array(mask.length);
  const output = new Float32Array(mask.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let offset = -2; offset <= 2; offset += 1) {
        const sourceX = clamp(x + offset, 0, width - 1);
        sum += mask[y * width + sourceX] * kernel[offset + 2];
      }
      horizontal[y * width + x] = sum / kernelSum;
    }
  }

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      for (let offset = -2; offset <= 2; offset += 1) {
        const sourceY = clamp(y + offset, 0, height - 1);
        sum += horizontal[sourceY * width + x] * kernel[offset + 2];
      }
      output[y * width + x] = sum / kernelSum;
    }
  }

  return output;
}

function sharpenUpscaledCoverage(coverage, scale) {
  if (scale < 1.35) return coverage;
  const halfWidth = 0.18;
  return smoothstep(0.5 - halfWidth, 0.5 + halfWidth, coverage);
}

function sinc(value) {
  if (Math.abs(value) < 1e-7) return 1;
  const angle = Math.PI * value;
  return Math.sin(angle) / angle;
}

function lanczos(value, lobes = 3) {
  const distance = Math.abs(value);
  if (distance >= lobes) return 0;
  return sinc(value) * sinc(value / lobes);
}

function resampleHorizontal(input, srcWidth, srcHeight, dstWidth) {
  const output = new Float32Array(dstWidth * srcHeight);
  const scale = dstWidth / srcWidth;
  const filterScale = Math.min(1, scale);
  const support = 3 / filterScale;

  for (let y = 0; y < srcHeight; y += 1) {
    for (let dx = 0; dx < dstWidth; dx += 1) {
      const sourceX = (dx + 0.5) / scale - 0.5;
      const left = Math.ceil(sourceX - support);
      const right = Math.floor(sourceX + support);
      let sum = 0;
      let weightSum = 0;

      for (let sx = left; sx <= right; sx += 1) {
        const clampedX = clamp(sx, 0, srcWidth - 1);
        const weight = lanczos((sourceX - sx) * filterScale);
        sum += input[y * srcWidth + clampedX] * weight;
        weightSum += weight;
      }

      output[y * dstWidth + dx] = weightSum === 0 ? 0 : clamp(sum / weightSum);
    }
  }

  return output;
}

function resampleMask(input, srcWidth, srcHeight, dstWidth, dstHeight) {
  const horizontal = resampleHorizontal(input, srcWidth, srcHeight, dstWidth);
  const output = new Float32Array(dstWidth * dstHeight);
  const scale = dstHeight / srcHeight;
  const filterScale = Math.min(1, scale);
  const support = 3 / filterScale;

  for (let dy = 0; dy < dstHeight; dy += 1) {
    const sourceY = (dy + 0.5) / scale - 0.5;
    const top = Math.ceil(sourceY - support);
    const bottom = Math.floor(sourceY + support);

    for (let x = 0; x < dstWidth; x += 1) {
      let sum = 0;
      let weightSum = 0;

      for (let sy = top; sy <= bottom; sy += 1) {
        const clampedY = clamp(sy, 0, srcHeight - 1);
        const weight = lanczos((sourceY - sy) * filterScale);
        sum += horizontal[clampedY * dstWidth + x] * weight;
        weightSum += weight;
      }

      output[dy * dstWidth + x] = weightSum === 0 ? 0 : clamp(sum / weightSum);
    }
  }

  return output;
}

function findMaskBounds(mask, width, height, threshold = 0.02) {
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (mask[y * width + x] <= threshold) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }

  if (right < left || bottom < top) {
    throw new Error('Could not find the white VN logo in the source image.');
  }

  return { left, top, right, bottom };
}

function cropMask(mask, width, bounds) {
  const cropWidth = bounds.right - bounds.left + 1;
  const cropHeight = bounds.bottom - bounds.top + 1;
  const cropped = new Float32Array(cropWidth * cropHeight);

  for (let y = 0; y < cropHeight; y += 1) {
    for (let x = 0; x < cropWidth; x += 1) {
      cropped[y * cropWidth + x] =
        mask[(bounds.top + y) * width + bounds.left + x];
    }
  }

  return { data: cropped, width: cropWidth, height: cropHeight };
}

function sampleBackground(backgroundRows, outputY, outputHeight) {
  const sourceY =
    outputHeight <= 1
      ? 0
      : (outputY / (outputHeight - 1)) * (backgroundRows.length - 1);
  const top = Math.floor(sourceY);
  const bottom = Math.min(backgroundRows.length - 1, top + 1);
  const ratio = sourceY - top;
  return {
    r: backgroundRows[top].r * (1 - ratio) + backgroundRows[bottom].r * ratio,
    g: backgroundRows[top].g * (1 - ratio) + backgroundRows[bottom].g * ratio,
    b: backgroundRows[top].b * (1 - ratio) + backgroundRows[bottom].b * ratio,
  };
}

function createPng(width, height) {
  return new PNG({ width, height, colorType: 6 });
}

function setPixel(image, x, y, r, g, b, a = 255) {
  const offset = (y * image.width + x) * 4;
  image.data[offset] = Math.round(clamp(r, 0, 255));
  image.data[offset + 1] = Math.round(clamp(g, 0, 255));
  image.data[offset + 2] = Math.round(clamp(b, 0, 255));
  image.data[offset + 3] = Math.round(clamp(a, 0, 255));
}

function createSquareIcon(size, logoMask, sourceWidth, sourceHeight, rows) {
  const image = createPng(size, size);
  const scaledMask = resampleMask(
    logoMask,
    sourceWidth,
    sourceHeight,
    size,
    size,
  );

  for (let y = 0; y < size; y += 1) {
    const background = sampleBackground(rows, y, size);
    for (let x = 0; x < size; x += 1) {
      const coverage = sharpenUpscaledCoverage(
        scaledMask[y * size + x],
        size / sourceWidth,
      );
      setPixel(
        image,
        x,
        y,
        background.r * (1 - coverage) + 255 * coverage,
        background.g * (1 - coverage) + 255 * coverage,
        background.b * (1 - coverage) + 255 * coverage,
      );
    }
  }

  return image;
}

function createBackground(size, rows) {
  const image = createPng(size, size);
  for (let y = 0; y < size; y += 1) {
    const background = sampleBackground(rows, y, size);
    for (let x = 0; x < size; x += 1) {
      setPixel(image, x, y, background.r, background.g, background.b);
    }
  }
  return image;
}

function createPositionedLogo(size, croppedLogo, targetWidthRatio = 68 / 108) {
  const targetWidth = Math.round(size * targetWidthRatio);
  const targetHeight = Math.round(
    (targetWidth * croppedLogo.height) / croppedLogo.width,
  );
  const scaledMask = resampleMask(
    croppedLogo.data,
    croppedLogo.width,
    croppedLogo.height,
    targetWidth,
    targetHeight,
  );
  const output = createPng(size, size);
  const offsetX = Math.floor((size - targetWidth) / 2);
  const offsetY = Math.floor((size - targetHeight) / 2);

  for (let y = 0; y < targetHeight; y += 1) {
    for (let x = 0; x < targetWidth; x += 1) {
      const coverage = sharpenUpscaledCoverage(
        scaledMask[y * targetWidth + x],
        targetWidth / croppedLogo.width,
      );
      setPixel(output, offsetX + x, offsetY + y, 255, 255, 255, coverage * 255);
    }
  }

  return output;
}

function createRoundIcon(size, croppedLogo, rows) {
  const image = createPng(size, size);
  const targetWidth = Math.round(size * 0.7);
  const targetHeight = Math.round(
    (targetWidth * croppedLogo.height) / croppedLogo.width,
  );
  const scaledMask = resampleMask(
    croppedLogo.data,
    croppedLogo.width,
    croppedLogo.height,
    targetWidth,
    targetHeight,
  );
  const offsetX = Math.floor((size - targetWidth) / 2);
  const offsetY = Math.floor((size - targetHeight) / 2);
  const center = (size - 1) / 2;
  const radius = size / 2 - 0.5;

  for (let y = 0; y < size; y += 1) {
    const background = sampleBackground(rows, y, size);
    for (let x = 0; x < size; x += 1) {
      const distance = Math.hypot(x - center, y - center);
      const circleCoverage = clamp(radius + 0.75 - distance);
      let logoCoverage = 0;
      const logoX = x - offsetX;
      const logoY = y - offsetY;
      if (
        logoX >= 0 &&
        logoX < targetWidth &&
        logoY >= 0 &&
        logoY < targetHeight
      ) {
        logoCoverage = sharpenUpscaledCoverage(
          scaledMask[logoY * targetWidth + logoX],
          targetWidth / croppedLogo.width,
        );
      }

      setPixel(
        image,
        x,
        y,
        background.r * (1 - logoCoverage) + 255 * logoCoverage,
        background.g * (1 - logoCoverage) + 255 * logoCoverage,
        background.b * (1 - logoCoverage) + 255 * logoCoverage,
        circleCoverage * 255,
      );
    }
  }

  return image;
}

function generate() {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source icon not found: ${sourcePath}`);
  }

  const source = readPng(sourcePath);
  const rows = estimateBackgroundRows(source);
  const logoMask = smoothLogoMask(
    removeBorderArtifacts(
      extractLogoMask(source, rows),
      source.width,
      source.height,
    ),
    source.width,
    source.height,
  );
  const bounds = findMaskBounds(logoMask, source.width, source.height);
  const croppedLogo = cropMask(logoMask, source.width, bounds);

  const master = createSquareIcon(
    1024,
    logoMask,
    source.width,
    source.height,
    rows,
  );
  writePng(path.join(projectRoot, 'assets', 'icon.png'), master, {
    colorType: 2,
  });
  writePng(path.join(iosIconDir, 'app-icon-1024.png'), master, {
    colorType: 2,
  });

  const iosSizes = {
    'Icon-App-20x20@1x.png': 20,
    'Icon-App-20x20@2x.png': 40,
    'Icon-App-20x20@3x.png': 60,
    'Icon-App-29x29@1x.png': 29,
    'Icon-App-29x29@2x.png': 58,
    'Icon-App-29x29@3x.png': 87,
    'Icon-App-40x40@1x.png': 40,
    'Icon-App-40x40@2x.png': 80,
    'Icon-App-40x40@3x.png': 120,
    'Icon-App-50x50@1x.png': 50,
    'Icon-App-50x50@2x.png': 100,
    'Icon-App-57x57@1x.png': 57,
    'Icon-App-57x57@2x.png': 114,
    'Icon-App-60x60@2x.png': 120,
    'Icon-App-60x60@3x.png': 180,
    'Icon-App-72x72@1x.png': 72,
    'Icon-App-72x72@2x.png': 144,
    'Icon-App-76x76@1x.png': 76,
    'Icon-App-76x76@2x.png': 152,
    'Icon-App-83.5x83.5@2x.png': 167,
  };

  for (const [filename, size] of Object.entries(iosSizes)) {
    writePng(
      path.join(iosIconDir, filename),
      createSquareIcon(size, logoMask, source.width, source.height, rows),
      { colorType: 2 },
    );
  }

  const androidDensities = {
    mdpi: { launcher: 48, adaptive: 108 },
    hdpi: { launcher: 72, adaptive: 162 },
    xhdpi: { launcher: 96, adaptive: 216 },
    xxhdpi: { launcher: 144, adaptive: 324 },
    xxxhdpi: { launcher: 192, adaptive: 432 },
  };

  for (const [density, sizes] of Object.entries(androidDensities)) {
    const directory = path.join(androidRes, `mipmap-${density}`);
    writePng(
      path.join(directory, 'ic_launcher.png'),
      createSquareIcon(
        sizes.launcher,
        logoMask,
        source.width,
        source.height,
        rows,
      ),
      { colorType: 2 },
    );
    writePng(
      path.join(directory, 'ic_launcher_round.png'),
      createRoundIcon(sizes.launcher, croppedLogo, rows),
    );
    writePng(
      path.join(directory, 'ic_launcher_background.png'),
      createBackground(sizes.adaptive, rows),
      { colorType: 2 },
    );
    writePng(
      path.join(directory, 'ic_launcher_foreground.png'),
      createPositionedLogo(sizes.adaptive, croppedLogo),
    );
    writePng(
      path.join(directory, 'ic_launcher_monochrome.png'),
      createPositionedLogo(sizes.adaptive, croppedLogo),
    );
  }

  console.log(
    JSON.stringify(
      {
        source: sourcePath,
        sourceSize: `${source.width}x${source.height}`,
        logoBounds: bounds,
        master: path.join(projectRoot, 'assets', 'icon.png'),
        androidDensities: Object.keys(androidDensities),
        iosImages: Object.keys(iosSizes).length + 1,
      },
      null,
      2,
    ),
  );
}

generate();
