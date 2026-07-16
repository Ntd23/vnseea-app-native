// Description: Builds and parses shareable VNSEEA map location links.
import { apiConfig } from '../../../shared-kernel/infrastructure/config/env';
import type { PostLinkPreview } from '../../../feed/domain/types/feed.types';

export type SharedMapLocation = {
  title: string;
  latitude: number;
  longitude: number;
  subtitle?: string;
  address?: string;
};

function cleanBaseUrl() {
  return (apiConfig.webBaseUrl || 'https://v2.vnseea.vn').replace(/\/+$/, '');
}

function formatCoordinateParam(value: number) {
  return Number(value.toFixed(6)).toString();
}

export function buildMapShareUrl(location: SharedMapLocation) {
  const params = new URLSearchParams({
    lat: formatCoordinateParam(location.latitude),
    lng: formatCoordinateParam(location.longitude),
  });
  const title = location.title.trim();

  if (title) {
    params.set('title', title.slice(0, 48));
  }

  return `${cleanBaseUrl()}/map?${params.toString()}`;
}

export function buildMapShareText(location: SharedMapLocation) {
  const address = location.address || location.subtitle;

  return [
    `📍 ${location.title}`,
    address ? `Địa chỉ: ${address}` : null,
    `Tọa độ: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
    `Mở bản đồ: ${buildMapShareUrl(location)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildMapSharePreview(
  location: SharedMapLocation,
  imageUrl?: string,
): PostLinkPreview {
  const coord = `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`;

  return {
    url: buildMapShareUrl(location),
    title: location.title,
    description: `Tọa độ: ${coord}`,
    image: imageUrl || undefined,
  };
}

export function parseMapShareUrl(rawUrl: string): SharedMapLocation | null {
  try {
    const url = new URL(rawUrl);
    const isSupportedHost =
      url.hostname === 'v2.vnseea.vn' ||
      url.hostname.endsWith('.vnseea.vn') ||
      url.protocol === 'vnseea:';
    const isMapPath =
      url.pathname === '/map' ||
      url.pathname === '/maps' ||
      url.pathname.endsWith('/map') ||
      url.pathname.endsWith('/maps') ||
      url.hostname === 'map';

    if (!isSupportedHost || !isMapPath) {
      return null;
    }

    const latitude = Number(url.searchParams.get('lat'));
    const longitude = Number(url.searchParams.get('lng'));
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }

    const address = url.searchParams.get('address') || undefined;

    return {
      title: url.searchParams.get('title') || 'Địa điểm đã chia sẻ',
      subtitle: address,
      address,
      latitude,
      longitude,
    };
  } catch {
    return null;
  }
}
