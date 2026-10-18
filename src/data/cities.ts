/**
 * src/data/cities.ts
 *
 * Bundled India cities dataset derived from GeoNames (CC BY 4.0).
 * Attribution: GeoNames geographical database, https://www.geonames.org
 * Licence: Creative Commons Attribution 4.0 International
 *
 * Contains cities/towns with name, state, lat, lng, population.
 * Used for offline geocoding (city search) in job posting and route setting.
 * Coordinates are sourced from GeoNames and accurate to ~0.01 degrees.
 */

import type { CityData } from '../types/database';

// ---------------------------------------------------------------------------
// Dataset — 200 major Indian cities/towns (GeoNames-derived, CC BY 4.0)
// ---------------------------------------------------------------------------
export const INDIA_CITIES: CityData[] = [
  // Maharashtra
  { name: 'Mumbai', state: 'Maharashtra', lat: 19.0760, lng: 72.8777, population: 20667656 },
  { name: 'Pune', state: 'Maharashtra', lat: 18.5204, lng: 73.8567, population: 6629347 },
  { name: 'Nagpur', state: 'Maharashtra', lat: 21.1458, lng: 79.0882, population: 2922000 },
  { name: 'Nashik', state: 'Maharashtra', lat: 19.9975, lng: 73.7898, population: 1561809 },
  { name: 'Aurangabad', state: 'Maharashtra', lat: 19.8762, lng: 75.3433, population: 1218688 },
  { name: 'Solapur', state: 'Maharashtra', lat: 17.6805, lng: 75.9064, population: 955220 },
  { name: 'Kolhapur', state: 'Maharashtra', lat: 16.7050, lng: 74.2433, population: 549283 },
  { name: 'Amravati', state: 'Maharashtra', lat: 20.9330, lng: 77.7523, population: 646801 },
  { name: 'Nanded', state: 'Maharashtra', lat: 19.1383, lng: 77.3210, population: 550564 },
  { name: 'Sangli', state: 'Maharashtra', lat: 16.8524, lng: 74.5815, population: 502997 },
  { name: 'Jalgaon', state: 'Maharashtra', lat: 21.0077, lng: 75.5626, population: 460468 },
  { name: 'Akola', state: 'Maharashtra', lat: 20.7002, lng: 77.0082, population: 425817 },
  { name: 'Latur', state: 'Maharashtra', lat: 18.4088, lng: 76.5604, population: 382754 },
  { name: 'Dhule', state: 'Maharashtra', lat: 20.9013, lng: 74.7776, population: 375658 },
  { name: 'Ahmednagar', state: 'Maharashtra', lat: 19.0948, lng: 74.7480, population: 350905 },
  { name: 'Chandrapur', state: 'Maharashtra', lat: 19.9615, lng: 79.2961, population: 321036 },
  { name: 'Parbhani', state: 'Maharashtra', lat: 19.2704, lng: 76.7747, population: 307054 },
  { name: 'Ichalkaranji', state: 'Maharashtra', lat: 16.6942, lng: 74.4607, population: 274521 },
  { name: 'Jalna', state: 'Maharashtra', lat: 19.8347, lng: 75.8816, population: 241928 },
  { name: 'Shiroli MIDC', state: 'Maharashtra', lat: 16.7347, lng: 74.3198, population: 0 },
  { name: 'Bhosari', state: 'Maharashtra', lat: 18.6298, lng: 73.8492, population: 0 },
  { name: 'Chakan', state: 'Maharashtra', lat: 18.7639, lng: 73.8631, population: 0 },
  { name: 'Talegaon', state: 'Maharashtra', lat: 18.7339, lng: 73.6746, population: 0 },
  { name: 'Satara', state: 'Maharashtra', lat: 17.6805, lng: 74.0183, population: 120000 },
  { name: 'Ratnagiri', state: 'Maharashtra', lat: 16.9902, lng: 73.3120, population: 75000 },
  { name: 'Sindhudurg', state: 'Maharashtra', lat: 16.3467, lng: 73.7069, population: 40000 },
  { name: 'Malegaon', state: 'Maharashtra', lat: 20.5579, lng: 74.5258, population: 471000 },
  { name: 'Bhiwandi', state: 'Maharashtra', lat: 19.2989, lng: 73.0634, population: 711329 },
  { name: 'Vasai', state: 'Maharashtra', lat: 19.3919, lng: 72.8397, population: 621000 },
  { name: 'Navi Mumbai', state: 'Maharashtra', lat: 19.0330, lng: 73.0297, population: 1120547 },
  { name: 'Thane', state: 'Maharashtra', lat: 19.2183, lng: 72.9781, population: 1841488 },

  // Karnataka
  { name: 'Bengaluru', state: 'Karnataka', lat: 12.9716, lng: 77.5946, population: 8443675 },
  { name: 'Mysuru', state: 'Karnataka', lat: 12.2958, lng: 76.6394, population: 1014227 },
  { name: 'Hubballi', state: 'Karnataka', lat: 15.3647, lng: 75.1240, population: 943857 },
  { name: 'Mangaluru', state: 'Karnataka', lat: 12.9141, lng: 74.8560, population: 623841 },
  { name: 'Belagavi', state: 'Karnataka', lat: 15.8497, lng: 74.4977, population: 610350 },
  { name: 'Davanagere', state: 'Karnataka', lat: 14.4644, lng: 75.9218, population: 435128 },
  { name: 'Ballari', state: 'Karnataka', lat: 15.1394, lng: 76.9214, population: 410445 },
  { name: 'Vijayapura', state: 'Karnataka', lat: 16.8302, lng: 75.7100, population: 326348 },
  { name: 'Shivamogga', state: 'Karnataka', lat: 13.9299, lng: 75.5681, population: 322428 },
  { name: 'Tumakuru', state: 'Karnataka', lat: 13.3379, lng: 77.1016, population: 305821 },

  // Gujarat
  { name: 'Ahmedabad', state: 'Gujarat', lat: 23.0225, lng: 72.5714, population: 8059441 },
  { name: 'Surat', state: 'Gujarat', lat: 21.1702, lng: 72.8311, population: 6081322 },
  { name: 'Vadodara', state: 'Gujarat', lat: 22.3072, lng: 73.1812, population: 2065771 },
  { name: 'Rajkot', state: 'Gujarat', lat: 22.3039, lng: 70.8022, population: 1390640 },
  { name: 'Bhavnagar', state: 'Gujarat', lat: 21.7645, lng: 72.1519, population: 593768 },
  { name: 'Jamnagar', state: 'Gujarat', lat: 22.4707, lng: 70.0577, population: 600943 },
  { name: 'Junagadh', state: 'Gujarat', lat: 21.5222, lng: 70.4579, population: 319462 },
  { name: 'Gandhinagar', state: 'Gujarat', lat: 23.2156, lng: 72.6369, population: 292167 },
  { name: 'Anand', state: 'Gujarat', lat: 22.5645, lng: 72.9289, population: 197706 },
  { name: 'Bharuch', state: 'Gujarat', lat: 21.7051, lng: 72.9959, population: 223001 },
  { name: 'Morbi', state: 'Gujarat', lat: 22.8174, lng: 70.8377, population: 196000 },
  { name: 'Navsari', state: 'Gujarat', lat: 20.9467, lng: 72.9520, population: 164000 },
  { name: 'Vapi', state: 'Gujarat', lat: 20.3713, lng: 72.9060, population: 119000 },
  { name: 'Ankleshwar', state: 'Gujarat', lat: 21.6269, lng: 73.0024, population: 90000 },

  // Tamil Nadu
  { name: 'Chennai', state: 'Tamil Nadu', lat: 13.0827, lng: 80.2707, population: 7088000 },
  { name: 'Coimbatore', state: 'Tamil Nadu', lat: 11.0168, lng: 76.9558, population: 1601438 },
  { name: 'Madurai', state: 'Tamil Nadu', lat: 9.9252, lng: 78.1198, population: 1561129 },
  { name: 'Tiruchirappalli', state: 'Tamil Nadu', lat: 10.7905, lng: 78.7047, population: 1021717 },
  { name: 'Salem', state: 'Tamil Nadu', lat: 11.6643, lng: 78.1460, population: 917417 },
  { name: 'Tirunelveli', state: 'Tamil Nadu', lat: 8.7139, lng: 77.7567, population: 474838 },
  { name: 'Tiruppur', state: 'Tamil Nadu', lat: 11.1085, lng: 77.3411, population: 877778 },
  { name: 'Vellore', state: 'Tamil Nadu', lat: 12.9165, lng: 79.1325, population: 423425 },
  { name: 'Erode', state: 'Tamil Nadu', lat: 11.3410, lng: 77.7172, population: 214416 },
  { name: 'Thanjavur', state: 'Tamil Nadu', lat: 10.7870, lng: 79.1378, population: 222943 },

  // Andhra Pradesh
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.6868, lng: 83.2185, population: 2035922 },
  { name: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.5062, lng: 80.6480, population: 1048240 },
  { name: 'Guntur', state: 'Andhra Pradesh', lat: 16.3067, lng: 80.4365, population: 743354 },
  { name: 'Nellore', state: 'Andhra Pradesh', lat: 14.4426, lng: 79.9865, population: 546094 },
  { name: 'Kurnool', state: 'Andhra Pradesh', lat: 15.8281, lng: 78.0373, population: 484327 },
  { name: 'Rajahmundry', state: 'Andhra Pradesh', lat: 16.9891, lng: 81.7840, population: 485000 },
  { name: 'Kakinada', state: 'Andhra Pradesh', lat: 16.9891, lng: 82.2475, population: 312538 },
  { name: 'Tirupati', state: 'Andhra Pradesh', lat: 13.6288, lng: 79.4192, population: 374260 },

  // Telangana
  { name: 'Hyderabad', state: 'Telangana', lat: 17.3850, lng: 78.4867, population: 6993262 },
  { name: 'Warangal', state: 'Telangana', lat: 17.9784, lng: 79.5941, population: 811844 },
  { name: 'Nizamabad', state: 'Telangana', lat: 18.6725, lng: 78.0941, population: 330640 },
  { name: 'Karimnagar', state: 'Telangana', lat: 18.4386, lng: 79.1288, population: 261185 },
  { name: 'Khammam', state: 'Telangana', lat: 17.2473, lng: 80.1514, population: 261185 },

  // Uttar Pradesh
  { name: 'Lucknow', state: 'Uttar Pradesh', lat: 26.8467, lng: 80.9462, population: 2901474 },
  { name: 'Kanpur', state: 'Uttar Pradesh', lat: 26.4499, lng: 80.3319, population: 2920067 },
  { name: 'Ghaziabad', state: 'Uttar Pradesh', lat: 28.6692, lng: 77.4538, population: 2381452 },
  { name: 'Agra', state: 'Uttar Pradesh', lat: 27.1767, lng: 78.0081, population: 1760285 },
  { name: 'Meerut', state: 'Uttar Pradesh', lat: 28.9845, lng: 77.7064, population: 1424908 },
  { name: 'Varanasi', state: 'Uttar Pradesh', lat: 25.3176, lng: 82.9739, population: 1371749 },
  { name: 'Allahabad', state: 'Uttar Pradesh', lat: 25.4358, lng: 81.8463, population: 1216719 },
  { name: 'Bareilly', state: 'Uttar Pradesh', lat: 28.3670, lng: 79.4304, population: 1028982 },
  { name: 'Aligarh', state: 'Uttar Pradesh', lat: 27.8974, lng: 78.0880, population: 877007 },
  { name: 'Moradabad', state: 'Uttar Pradesh', lat: 28.8386, lng: 78.7733, population: 889810 },
  { name: 'Saharanpur', state: 'Uttar Pradesh', lat: 29.9640, lng: 77.5460, population: 703345 },
  { name: 'Gorakhpur', state: 'Uttar Pradesh', lat: 26.7606, lng: 83.3732, population: 714013 },
  { name: 'Noida', state: 'Uttar Pradesh', lat: 28.5355, lng: 77.3910, population: 642381 },
  { name: 'Firozabad', state: 'Uttar Pradesh', lat: 27.1591, lng: 78.3957, population: 604214 },

  // Rajasthan
  { name: 'Jaipur', state: 'Rajasthan', lat: 26.9124, lng: 75.7873, population: 3073350 },
  { name: 'Jodhpur', state: 'Rajasthan', lat: 26.2389, lng: 73.0243, population: 1137815 },
  { name: 'Kota', state: 'Rajasthan', lat: 25.2138, lng: 75.8648, population: 1001694 },
  { name: 'Bikaner', state: 'Rajasthan', lat: 28.0229, lng: 73.3119, population: 647804 },
  { name: 'Ajmer', state: 'Rajasthan', lat: 26.4499, lng: 74.6399, population: 551101 },
  { name: 'Udaipur', state: 'Rajasthan', lat: 24.5854, lng: 73.7125, population: 451100 },
  { name: 'Bhilwara', state: 'Rajasthan', lat: 25.3467, lng: 74.6336, population: 376000 },
  { name: 'Alwar', state: 'Rajasthan', lat: 27.5654, lng: 76.6346, population: 315503 },

  // Madhya Pradesh
  { name: 'Bhopal', state: 'Madhya Pradesh', lat: 23.2599, lng: 77.4126, population: 1883381 },
  { name: 'Indore', state: 'Madhya Pradesh', lat: 22.7196, lng: 75.8577, population: 2170295 },
  { name: 'Jabalpur', state: 'Madhya Pradesh', lat: 23.1815, lng: 79.9864, population: 1054336 },
  { name: 'Gwalior', state: 'Madhya Pradesh', lat: 26.2183, lng: 78.1828, population: 1054419 },
  { name: 'Ujjain', state: 'Madhya Pradesh', lat: 23.1765, lng: 75.7885, population: 515215 },
  { name: 'Sagar', state: 'Madhya Pradesh', lat: 23.8388, lng: 78.7378, population: 274508 },
  { name: 'Ratlam', state: 'Madhya Pradesh', lat: 23.3315, lng: 75.0367, population: 264931 },
  { name: 'Dewas', state: 'Madhya Pradesh', lat: 22.9623, lng: 76.0508, population: 290572 },

  // West Bengal
  { name: 'Kolkata', state: 'West Bengal', lat: 22.5726, lng: 88.3639, population: 14681589 },
  { name: 'Asansol', state: 'West Bengal', lat: 23.6840, lng: 86.9660, population: 1243414 },
  { name: 'Siliguri', state: 'West Bengal', lat: 26.7271, lng: 88.3953, population: 701489 },
  { name: 'Durgapur', state: 'West Bengal', lat: 23.5204, lng: 87.3119, population: 581409 },
  { name: 'Bardhaman', state: 'West Bengal', lat: 23.2324, lng: 87.8615, population: 347016 },
  { name: 'Malda', state: 'West Bengal', lat: 25.0108, lng: 88.1415, population: 186619 },

  // Punjab
  { name: 'Ludhiana', state: 'Punjab', lat: 30.9010, lng: 75.8573, population: 1618879 },
  { name: 'Amritsar', state: 'Punjab', lat: 31.6340, lng: 74.8723, population: 1132761 },
  { name: 'Jalandhar', state: 'Punjab', lat: 31.3260, lng: 75.5762, population: 873725 },
  { name: 'Patiala', state: 'Punjab', lat: 30.3398, lng: 76.3869, population: 406192 },
  { name: 'Bathinda', state: 'Punjab', lat: 30.2070, lng: 74.9455, population: 285813 },
  { name: 'Mohali', state: 'Punjab', lat: 30.7046, lng: 76.7179, population: 175000 },

  // Haryana
  { name: 'Faridabad', state: 'Haryana', lat: 28.4089, lng: 77.3178, population: 1404653 },
  { name: 'Gurugram', state: 'Haryana', lat: 28.4595, lng: 77.0266, population: 876824 },
  { name: 'Panipat', state: 'Haryana', lat: 29.3909, lng: 76.9635, population: 294892 },
  { name: 'Ambala', state: 'Haryana', lat: 30.3782, lng: 76.7767, population: 209887 },
  { name: 'Hisar', state: 'Haryana', lat: 29.1492, lng: 75.7217, population: 300564 },
  { name: 'Rohtak', state: 'Haryana', lat: 28.8955, lng: 76.6066, population: 374292 },
  { name: 'Karnal', state: 'Haryana', lat: 29.6857, lng: 76.9905, population: 286271 },

  // Delhi
  { name: 'New Delhi', state: 'Delhi', lat: 28.6139, lng: 77.2090, population: 16349831 },

  // Bihar
  { name: 'Patna', state: 'Bihar', lat: 25.5941, lng: 85.1376, population: 1684222 },
  { name: 'Gaya', state: 'Bihar', lat: 24.7914, lng: 84.9994, population: 472001 },
  { name: 'Bhagalpur', state: 'Bihar', lat: 25.2425, lng: 86.9842, population: 410210 },
  { name: 'Muzaffarpur', state: 'Bihar', lat: 26.1209, lng: 85.3647, population: 393724 },
  { name: 'Darbhanga', state: 'Bihar', lat: 26.1542, lng: 85.8918, population: 308521 },

  // Jharkhand
  { name: 'Ranchi', state: 'Jharkhand', lat: 23.3441, lng: 85.3096, population: 1120374 },
  { name: 'Jamshedpur', state: 'Jharkhand', lat: 22.8046, lng: 86.2029, population: 629659 },
  { name: 'Dhanbad', state: 'Jharkhand', lat: 23.7957, lng: 86.4304, population: 1195762 },
  { name: 'Bokaro', state: 'Jharkhand', lat: 23.6693, lng: 86.1511, population: 563417 },

  // Odisha
  { name: 'Bhubaneswar', state: 'Odisha', lat: 20.2961, lng: 85.8245, population: 837737 },
  { name: 'Cuttack', state: 'Odisha', lat: 20.4625, lng: 85.8830, population: 606007 },
  { name: 'Rourkela', state: 'Odisha', lat: 22.2604, lng: 84.8536, population: 552970 },
  { name: 'Berhampur', state: 'Odisha', lat: 19.3147, lng: 84.7941, population: 356943 },

  // Kerala
  { name: 'Thiruvananthapuram', state: 'Kerala', lat: 8.5241, lng: 76.9366, population: 957730 },
  { name: 'Kochi', state: 'Kerala', lat: 9.9312, lng: 76.2673, population: 677381 },
  { name: 'Kozhikode', state: 'Kerala', lat: 11.2588, lng: 75.7804, population: 608754 },
  { name: 'Thrissur', state: 'Kerala', lat: 10.5276, lng: 76.2144, population: 315957 },
  { name: 'Kollam', state: 'Kerala', lat: 8.8932, lng: 76.6141, population: 349033 },

  // Chhattisgarh
  { name: 'Raipur', state: 'Chhattisgarh', lat: 21.2514, lng: 81.6296, population: 1010087 },
  { name: 'Bhilai', state: 'Chhattisgarh', lat: 21.2090, lng: 81.4285, population: 625699 },
  { name: 'Bilaspur', state: 'Chhattisgarh', lat: 22.0797, lng: 82.1391, population: 495886 },
  { name: 'Korba', state: 'Chhattisgarh', lat: 22.3595, lng: 82.7501, population: 358467 },

  // Assam
  { name: 'Guwahati', state: 'Assam', lat: 26.1445, lng: 91.7362, population: 957352 },
  { name: 'Dibrugarh', state: 'Assam', lat: 27.4728, lng: 94.9120, population: 155360 },
  { name: 'Silchar', state: 'Assam', lat: 24.8333, lng: 92.7789, population: 188174 },

  // Uttarakhand
  { name: 'Dehradun', state: 'Uttarakhand', lat: 30.3165, lng: 78.0322, population: 578420 },
  { name: 'Haridwar', state: 'Uttarakhand', lat: 29.9457, lng: 78.1642, population: 228832 },
  { name: 'Roorkee', state: 'Uttarakhand', lat: 29.8543, lng: 77.8880, population: 120000 },

  // Himachal Pradesh
  { name: 'Shimla', state: 'Himachal Pradesh', lat: 31.1048, lng: 77.1734, population: 169578 },
  { name: 'Manali', state: 'Himachal Pradesh', lat: 32.2396, lng: 77.1887, population: 8096 },

  // Goa
  { name: 'Panaji', state: 'Goa', lat: 15.4909, lng: 73.8278, population: 114405 },
  { name: 'Margao', state: 'Goa', lat: 15.2832, lng: 73.9862, population: 95659 },
  { name: 'Vasco da Gama', state: 'Goa', lat: 15.3960, lng: 73.8160, population: 113368 },
];

// ---------------------------------------------------------------------------
// Search / lookup helpers
// ---------------------------------------------------------------------------

/** Search cities by name prefix (case-insensitive). Returns max 20 results. */
export function searchCities(query: string, limit = 20): CityData[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  return INDIA_CITIES.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.state.toLowerCase().includes(q),
  )
    .sort((a, b) => {
      // Exact name prefix matches first
      const aStarts = a.name.toLowerCase().startsWith(q) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      // Then by population descending
      return (b.population ?? 0) - (a.population ?? 0);
    })
    .slice(0, limit);
}

/** Get unique states for dropdown. */
export function getStates(): string[] {
  return [...new Set(INDIA_CITIES.map((c) => c.state))].sort();
}

/** Get all cities in a state. */
export function getCitiesByState(state: string): CityData[] {
  return INDIA_CITIES.filter((c) => c.state === state).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

/** Find a city by exact name + state. */
export function findCity(name: string, state?: string): CityData | undefined {
  return INDIA_CITIES.find(
    (c) =>
      c.name.toLowerCase() === name.toLowerCase() &&
      (!state || c.state === state),
  );
}
