// Global types for React Native

declare global {
  var onRouteSelected:
    | ((route: {
        start: { latitude: number; longitude: number; address?: string };
        end: { latitude: number; longitude: number; address?: string };
        distance: number;
        duration: number;
      }) => void)
    | undefined;
  
  var onLocationSelected:
    | ((data: {
        type: string; // 'pickup' or 'delivery'
        location: { latitude: number; longitude: number; address?: string };
      }) => void)
    | undefined;
}

export {};
