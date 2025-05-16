// interfaces/route.ts
export interface Coordinates {
  x: number;
  y: number;
}

export interface PathPoint {
  x: number;
  y: number;
  id?: string;
}

export interface Product {
  name: string;
  location: string;
  section: string;
  coordinates: Coordinates;
}

export interface RoutePoint {
  order: number;
  item: string;
  location: string;
  section?: string;
  coordinates: Coordinates;
  pathPoints?: PathPoint[]; // 경로 포인트 추가
}

export interface RouteData {
  items: Product[];
  route: RoutePoint[];
  total_distance: number;
}