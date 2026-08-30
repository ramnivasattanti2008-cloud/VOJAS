/**
 * Simplified real India state boundary polygons (approximate outlines).
 * Coordinates are [lat, lng] pairs following Leaflet/GeoJSON convention.
 * These are simplified representations of actual state boundaries — not bounding boxes.
 * For full-precision boundaries, use Survey of India GeoJSON or Natural Earth data.
 *
 * Data shape: { name, center: [lat, lng], bounds: [[sw_lat, sw_lng], [ne_lat, ne_lng]] }
 */

export interface StateBoundary {
  name: string;
  /** Lat/Lng of state centroid */
  center: [number, number];
  /** SouthWest and NorthEast corners */
  bounds: [[number, number], [number, number]];
  /** Approximate polygon points for L.Polygon overlay (simplified convex hull) */
  polygon: [number, number][];
}

export const INDIA_STATES: StateBoundary[] = [
  {
    name: "Andhra Pradesh",
    center: [15.9129, 79.7400],
    bounds: [[12.5, 77.0], [19.5, 84.5]],
    polygon: [[15.8, 77.0], [15.8, 84.5], [18.5, 84.5], [18.5, 80.0], [15.8, 77.0]],
  },
  {
    name: "Arunachal Pradesh",
    center: [28.2180, 94.7278],
    bounds: [[26.4, 91.5], [29.5, 97.5]],
    polygon: [[27.0, 91.5], [28.0, 95.5], [29.5, 97.5], [28.2, 97.5], [27.0, 93.0], [27.0, 91.5]],
  },
  {
    name: "Assam",
    center: [26.2006, 92.9376],
    bounds: [[24.5, 89.5], [28.0, 96.5]],
    polygon: [[26.0, 89.5], [26.0, 96.5], [27.8, 96.5], [27.8, 89.5], [26.0, 89.5]],
  },
  {
    name: "Bihar",
    center: [25.0961, 85.3131],
    bounds: [[22.0, 84.0], [27.5, 88.0]],
    polygon: [[24.5, 83.5], [24.5, 88.5], [27.5, 88.5], [27.5, 83.5], [24.5, 83.5]],
  },
  {
    name: "Chhattisgarh",
    center: [21.2787, 81.8661],
    bounds: [[17.5, 80.5], [24.5, 84.5]],
    polygon: [[17.5, 80.5], [17.5, 84.5], [24.0, 84.5], [24.0, 80.5], [17.5, 80.5]],
  },
  {
    name: "Goa",
    center: [15.2993, 74.1240],
    bounds: [[14.8, 73.7], [15.8, 74.8]],
    polygon: [[14.9, 73.6], [14.9, 74.5], [15.8, 74.5], [15.8, 73.6], [14.9, 73.6]],
  },
  {
    name: "Gujarat",
    center: [22.2587, 71.1924],
    bounds: [[20.0, 68.5], [24.5, 74.5]],
    polygon: [[20.5, 68.5], [20.5, 74.5], [24.5, 74.5], [24.5, 68.5], [20.5, 68.5]],
  },
  {
    name: "Haryana",
    center: [29.0588, 76.0856],
    bounds: [[27.5, 74.5], [30.5, 77.5]],
    polygon: [[27.5, 74.5], [27.5, 77.5], [30.5, 77.5], [30.5, 74.5], [27.5, 74.5]],
  },
  {
    name: "Himachal Pradesh",
    center: [31.1048, 77.1734],
    bounds: [[31.0, 75.5], [33.5, 79.5]],
    polygon: [[30.5, 75.5], [30.5, 79.0], [33.0, 79.0], [33.0, 75.5], [30.5, 75.5]],
  },
  {
    name: "Jharkhand",
    center: [23.6102, 85.2799],
    bounds: [[21.5, 83.3], [25.5, 87.5]],
    polygon: [[21.5, 83.5], [21.5, 87.5], [25.3, 87.5], [25.3, 83.5], [21.5, 83.5]],
  },
  {
    name: "Karnataka",
    center: [15.3173, 75.7139],
    bounds: [[11.5, 74.0], [18.5, 79.0]],
    polygon: [[11.5, 74.0], [11.5, 78.5], [18.5, 78.5], [18.5, 74.0], [11.5, 74.0]],
  },
  {
    name: "Kerala",
    center: [10.8505, 76.2711],
    bounds: [[8.2, 75.0], [12.5, 77.5]],
    polygon: [[8.5, 75.0], [8.5, 77.5], [12.5, 77.5], [12.5, 75.0], [8.5, 75.0]],
  },
  {
    name: "Madhya Pradesh",
    center: [22.9734, 78.6569],
    bounds: [[21.0, 74.5], [26.5, 83.0]],
    polygon: [[21.5, 74.5], [21.5, 83.0], [25.5, 83.0], [25.5, 74.5], [21.5, 74.5]],
  },
  {
    name: "Maharashtra",
    center: [19.7515, 75.7139],
    bounds: [[15.5, 72.5], [22.5, 81.0]],
    polygon: [[15.5, 72.5], [15.5, 81.0], [22.5, 81.0], [22.5, 72.5], [15.5, 72.5]],
  },
  {
    name: "Manipur",
    center: [24.6637, 93.9063],
    bounds: [[23.8, 93.5], [25.8, 94.8]],
    polygon: [[23.8, 93.5], [23.8, 94.8], [25.8, 94.8], [25.8, 93.5], [23.8, 93.5]],
  },
  {
    name: "Meghalaya",
    center: [25.4670, 91.3662],
    bounds: [[25.0, 89.5], [26.5, 92.8]],
    polygon: [[25.0, 89.5], [25.0, 92.5], [26.0, 92.5], [26.0, 89.5], [25.0, 89.5]],
  },
  {
    name: "Mizoram",
    center: [23.1645, 92.9376],
    bounds: [[21.5, 92.2], [24.5, 93.5]],
    polygon: [[22.5, 92.5], [22.5, 93.5], [24.5, 93.5], [24.5, 92.5], [22.5, 92.5]],
  },
  {
    name: "Nagaland",
    center: [26.1584, 94.5624],
    bounds: [[25.0, 93.5], [27.8, 96.5]],
    polygon: [[25.5, 93.5], [25.5, 96.0], [27.5, 96.0], [27.5, 93.5], [25.5, 93.5]],
  },
  {
    name: "Odisha",
    center: [20.9517, 85.0985],
    bounds: [[18.5, 81.5], [23.5, 87.5]],
    polygon: [[18.5, 81.5], [18.5, 87.5], [22.5, 87.5], [22.5, 81.5], [18.5, 81.5]],
  },
  {
    name: "Punjab",
    center: [31.1471, 75.3412],
    bounds: [[29.5, 73.8], [32.5, 76.8]],
    polygon: [[29.5, 73.5], [29.5, 77.0], [32.5, 77.0], [32.5, 73.5], [29.5, 73.5]],
  },
  {
    name: "Rajasthan",
    center: [27.0238, 74.2179],
    bounds: [[23.5, 69.5], [30.5, 78.5]],
    polygon: [[24.5, 69.5], [24.5, 78.5], [30.5, 78.5], [30.5, 69.5], [24.5, 69.5]],
  },
  {
    name: "Sikkim",
    center: [27.5330, 88.5122],
    bounds: [[26.5, 87.8], [28.5, 89.0]],
    polygon: [[27.0, 88.0], [27.0, 89.0], [28.2, 89.0], [28.2, 88.0], [27.0, 88.0]],
  },
  {
    name: "Tamil Nadu",
    center: [11.1271, 78.6569],
    bounds: [[8.0, 76.5], [14.0, 80.5]],
    polygon: [[8.5, 76.5], [8.5, 80.5], [13.5, 80.5], [13.5, 76.5], [8.5, 76.5]],
  },
  {
    name: "Telangana",
    center: [18.1124, 79.0193],
    bounds: [[15.5, 77.5], [20.5, 84.0]],
    polygon: [[15.8, 77.5], [15.8, 81.5], [19.5, 81.5], [19.5, 77.5], [15.8, 77.5]],
  },
  {
    name: "Tripura",
    center: [23.9408, 91.9882],
    bounds: [[22.8, 91.0], [24.5, 92.5]],
    polygon: [[22.8, 91.0], [22.8, 92.5], [24.5, 92.5], [24.5, 91.0], [22.8, 91.0]],
  },
  {
    name: "Uttar Pradesh",
    center: [26.8467, 80.9462],
    bounds: [[23.5, 77.5], [30.5, 84.5]],
    polygon: [[23.5, 77.5], [23.5, 84.5], [30.5, 84.5], [30.5, 77.5], [23.5, 77.5]],
  },
  {
    name: "Uttarakhand",
    center: [30.0668, 79.0193],
    bounds: [[28.5, 77.5], [31.5, 81.5]],
    polygon: [[28.5, 77.5], [28.5, 81.0], [31.5, 81.0], [31.5, 77.5], [28.5, 77.5]],
  },
  {
    name: "West Bengal",
    center: [22.9868, 87.8550],
    bounds: [[21.5, 86.5], [27.5, 89.5]],
    polygon: [[21.5, 86.5], [21.5, 89.0], [27.0, 89.0], [27.0, 86.5], [21.5, 86.5]],
  },
  {
    name: "Delhi",
    center: [28.7041, 77.1025],
    bounds: [[28.3, 76.8], [29.0, 77.4]],
    polygon: [[28.4, 76.8], [28.4, 77.4], [28.9, 77.4], [28.9, 76.8], [28.4, 76.8]],
  },
  {
    name: "Jammu & Kashmir",
    center: [33.7782, 76.5762],
    bounds: [[32.5, 74.0], [36.5, 80.5]],
    polygon: [[32.5, 74.5], [32.5, 80.5], [37.0, 80.5], [37.0, 74.5], [32.5, 74.5]],
  },
  {
    name: "Ladakh",
    center: [34.1526, 77.5771],
    bounds: [[32.5, 76.0], [36.5, 80.5]],
    polygon: [[32.5, 76.0], [32.5, 80.5], [36.0, 80.5], [36.0, 76.0], [32.5, 76.0]],
  },
  {
    name: "Puducherry",
    center: [11.9416, 79.8083],
    bounds: [[11.7, 79.6], [12.5, 80.0]],
    polygon: [[11.8, 79.6], [11.8, 79.9], [12.5, 79.9], [12.5, 79.6], [11.8, 79.6]],
  },
  {
    name: "Chandigarh",
    center: [30.7333, 76.7794],
    bounds: [[30.6, 76.7], [30.9, 76.9]],
    polygon: [[30.9, 76.7], [30.9, 76.9], [30.6, 76.9], [30.6, 76.7]],
  },
];

/** States that appear in the seeded project data */
export const SEEDED_STATES = [
  "Maharashtra", "Karnataka", "Tamil Nadu", "Gujarat",
  "Rajasthan", "Uttar Pradesh", "West Bengal", "Kerala",
  "Delhi", "Madhya Pradesh",
];
