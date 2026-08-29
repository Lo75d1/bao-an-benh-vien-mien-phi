export function mealOverrideForClock<T>(requestedMeal: T | undefined, simulated: boolean) {
  return simulated ? undefined : requestedMeal;
}
