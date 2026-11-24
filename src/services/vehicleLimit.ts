/**
 * A member may park at most MAX_CARS_PER_MEMBER four-wheel vehicles (car, SUV, van, taxi, heavy vehicle…).
 * Two-wheelers are not counted. Struck-off vehicles are not counted either.
 */
import type { Vehicle, VehicleCategory } from '../types';

export const MAX_CARS_PER_MEMBER = 2;

export const countsTowardLimit = (v: Pick<Vehicle, 'category' | 'status'>) =>
  v.status !== 'radie' && v.category !== 'Deux-Roues (2R)';

/** Four-wheel vehicles of a member that count toward the limit (optionally ignoring one vehicle). */
export function carsOf(vehicles: Vehicle[], memberId: string, exceptId?: string): Vehicle[] {
  return vehicles.filter((v) => v.memberId === memberId && v.id !== exceptId && countsTowardLimit(v));
}

/**
 * Error message when giving this vehicle (new, or changed) to the member would exceed the limit, or null.
 * `vehicle` is the vehicle as it will be after the change.
 */
export function vehicleLimitProblem(
  vehicles: Vehicle[],
  memberId: string,
  vehicle: { id?: string; category: VehicleCategory | string; status?: Vehicle['status'] }
): string | null {
  if (!countsTowardLimit({ category: vehicle.category as VehicleCategory, status: vehicle.status || 'actif' })) return null;
  const already = carsOf(vehicles, memberId, vehicle.id);
  if (already.length < MAX_CARS_PER_MEMBER) return null;
  return `Un membre ne peut pas avoir plus de ${MAX_CARS_PER_MEMBER} voitures (déjà : ${already
    .map((v) => v.licensePlate)
    .join(', ')}). Les deux-roues ne sont pas comptés.`;
}
