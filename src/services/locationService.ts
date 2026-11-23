import * as Location from 'expo-location';
import {
  getLocationErrorMessage,
  requestLocationPermission,
} from './permissionService';

export interface Coordinates {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
}

export interface LaboratoryLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  radiusMeters: number;
}

export interface LocationService {
  getCurrentCoordinates(): Promise<Coordinates>;
  watchUserLocation(
    onChange: (coordinates: Coordinates) => void,
    onError?: (message: string) => void
  ): Promise<() => void>;
}

export const MAX_ACCEPTABLE_ACCURACY_METERS = 150;
const DEFAULT_LOCATION_TIMEOUT_MS = 15000;
const EARTH_RADIUS_METERS = 6371000;

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Menghitung jarak geodesik dalam meter menggunakan rumus Haversine. */
export const calculateDistanceMeters = (
  from: Pick<Coordinates, 'latitude' | 'longitude'>,
  to: Pick<Coordinates, 'latitude' | 'longitude'>
): number => {
  const dLat = toRadians(to.latitude - from.latitude);
  const dLon = toRadians(to.longitude - from.longitude);
  const lat1 = toRadians(from.latitude);
  const lat2 = toRadians(to.latitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
};

export const isValidCoordinatePair = (
  latitude: unknown,
  longitude: unknown
): boolean =>
  typeof latitude === 'number' &&
  typeof longitude === 'number' &&
  Number.isFinite(latitude) &&
  Number.isFinite(longitude) &&
  latitude >= -90 &&
  latitude <= 90 &&
  longitude >= -180 &&
  longitude <= 180;

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Location request timed out'));
    }, timeoutMs);

    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timer);
        reject(error);
      });
  });

export const getCurrentCoordinates = async (
  timeoutMs = DEFAULT_LOCATION_TIMEOUT_MS
): Promise<Coordinates> => {
  const permission = await requestLocationPermission();
  if (!permission.granted) {
    throw new Error(permission.message);
  }

  try {
    const position = await withTimeout(
      Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      }),
      timeoutMs
    );

    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy:
        typeof position.coords.accuracy === 'number'
          ? position.coords.accuracy
          : null,
    };
  } catch (error) {
    throw new Error(getLocationErrorMessage(error));
  }
};

export const watchUserLocation = async (
  onChange: (coordinates: Coordinates) => void,
  onError?: (message: string) => void
): Promise<() => void> => {
  const permission = await requestLocationPermission();
  if (!permission.granted) {
    onError?.(permission.message);
    return () => undefined;
  }

  try {
    const subscription = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 3000,
        distanceInterval: 5,
      },
      (position) => {
        onChange({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy:
            typeof position.coords.accuracy === 'number'
              ? position.coords.accuracy
              : null,
        });
      }
    );

    return () => {
      subscription.remove();
    };
  } catch (error) {
    onError?.(getLocationErrorMessage(error));
    return () => undefined;
  }
};

export const locationService: LocationService = {
  getCurrentCoordinates,
  watchUserLocation,
};
