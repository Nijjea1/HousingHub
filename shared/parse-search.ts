/** Turns "2 bed under $900 within 2 km of campus, furnished" into search filters, with plain rules (no model). */
import {
  DEFAULT_LISTING_FILTERS,
  MAX_SEARCH_RADIUS_KM,
  PROPERTY_TYPE_LABELS,
  type ListingFilters,
  type ParsedSearch,
  type PropertyType,
  type SortOption,
} from "./schema.js";

const WORD_NUMBERS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};
const NUM = String.raw`(\d+(?:\.\d+)?|${Object.keys(WORD_NUMBERS).join("|")})`;
const toNumber = (raw: string) => WORD_NUMBERS[raw] ?? Number(raw);

/** "$1,200", "1.2k", "900" as dollars. */
const MONEY = String.raw`\$?\s?(\d+(?:\.\d+)?k?)`;
const toDollars = (raw: string) => (raw.endsWith("k") ? Number(raw.slice(0, -1)) * 1000 : Number(raw));
// Rents below this are almost certainly not prices ("2 to 3 bedrooms").
const MIN_RENT = 100;

const TYPE_WORDS: Array<[RegExp, PropertyType]> = [
  [/\b(?:apartments?|apts?|condos?|flats?)\b/, "apartment"],
  [/\b(?:houses?|townhouses?|townhomes?|semis?)\b/, "house"],
  [/\b(?:dorms?|dormitory|dormitories|residences?)\b/, "dormitory"],
  [/\b(?:studios?|bachelors?)\b/, "studio"],
];

// Longer phrases first so "bike parking" isn't read as plain parking.
const AMENITY_WORDS: Array<[RegExp, string]> = [
  [/\bbike (?:storage|room|parking|lockers?)\b/, "Bike Storage"],
  [/\b(?:wi-?fi|internet)\b/, "WiFi"],
  [/\b(?:in-?suite |ensuite )?(?:laundry|washer(?: and dryer)?)\b/, "Laundry"],
  [/\b(?:parking|garage|driveway)\b/, "Parking"],
  [/\b(?:gym|fitness)\b/, "Gym"],
  [/\b(?:air conditioning|air conditioned|a\/c|ac)\b/, "Air Conditioning"],
  [/\bdishwasher\b/, "Dishwasher"],
  [/\b(?:security|secure building|concierge)\b/, "Security"],
];

const SORT_WORDS: Array<[RegExp, SortOption, string]> = [
  [/\b(?:cheapest|lowest price|most affordable)\b/, "price-low", "Cheapest first"],
  [/\b(?:closest|nearest)\b/, "distance", "Nearest first"],
  [/\b(?:newest|latest|most recent)\b/, "newest", "Newest first"],
];

const CAMPUS = String.raw`(?:campus|school|mcmaster|mac|university|uni)`;
const WALK_KM_PER_MINUTE = 0.08; // about 4.8 km/h
const WALKING_DISTANCE_KM = 1.5;
const NEAR_CAMPUS_KM = 2;

const roundUpTenth = (km: number) => Math.ceil(km * 10) / 10;
const clampRadius = (km: number) => Math.min(MAX_SEARCH_RADIUS_KM, Math.max(0.1, roundUpTenth(km)));

/** Finds the first match, records it, and blanks it out so later rules can't reuse its words or numbers. */
function take(state: { text: string }, pattern: RegExp): RegExpExecArray | null {
  const match = pattern.exec(state.text);
  if (match) state.text = state.text.slice(0, match.index) + " ".repeat(match[0].length) + state.text.slice(match.index + match[0].length);
  return match;
}

export function parseSearch(query: string): ParsedSearch {
  const state = {
    text: ` ${query.toLowerCase().replace(/(\d),(\d{3})\b/g, "$1$2").replace(/[\u2013\u2014]/g, "-")} `,
  };
  const filters: ListingFilters = { ...DEFAULT_LISTING_FILTERS, propertyTypes: [], amenities: [] };
  let radiusKm: number | null = null;
  const understood: string[] = [];

  // Distance: explicit units first, then walking time, then vague phrases.
  let m = take(state, new RegExp(String.raw`(?:within|under|less than|<)?\s*${NUM}\s*(km|kms|kilomet(?:re|er)s?|m|metres?|meters?)\b(?:\s*(?:of|from|to)\s*(?:the\s+)?${CAMPUS}\b)?`));
  if (m) {
    const value = toNumber(m[1]);
    radiusKm = clampRadius(/^(?:m|met)/.test(m[2]) ? value / 1000 : value);
  } else if ((m = take(state, /(\d+)\s*-?\s*min(?:ute)?s?\s*walk/))) {
    radiusKm = clampRadius(Number(m[1]) * WALK_KM_PER_MINUTE);
  } else if (take(state, /\bwalking distance\b/)) {
    radiusKm = WALKING_DISTANCE_KM;
  } else if (take(state, new RegExp(String.raw`\b(?:near|close to|by|next to|around)\s+(?:the\s+)?${CAMPUS}\b`))) {
    radiusKm = NEAR_CAMPUS_KM;
  }
  if (radiusKm !== null) understood.push(`Within ${radiusKm} km of campus`);

  if ((m = take(state, new RegExp(String.raw`${NUM}\s*\+?\s*-?\s*(?:bed(?:room)?s?|br|bd|bdrms?)\b`)))) {
    filters.minBedrooms = Math.round(toNumber(m[1]));
    understood.push(`${filters.minBedrooms}+ bedrooms`);
  }
  if ((m = take(state, new RegExp(String.raw`${NUM}\s*\+?\s*-?\s*(?:bath(?:room)?s?|washrooms?|ba)\b`)))) {
    filters.minBathrooms = Math.round(toNumber(m[1]) * 2) / 2;
    understood.push(`${filters.minBathrooms}+ bathrooms`);
  }

  // Prices. A number counts only when it looks like rent (>= $100), never a bedroom or km count.
  const rent = (raw: string) => {
    const dollars = toDollars(raw);
    return dollars >= MIN_RENT ? dollars : null;
  };
  if ((m = take(state, new RegExp(String.raw`(?:between\s+)?${MONEY}\s*(?:-|to|and)\s*${MONEY}`)))) {
    const [a, b] = [rent(m[1]), rent(m[2])];
    if (a !== null && b !== null) [filters.minPrice, filters.maxPrice] = [Math.min(a, b), Math.max(a, b)];
  }
  if (filters.maxPrice === null && (m = take(state, new RegExp(String.raw`(?:under|below|less than|max(?:imum)?|up to|no more than|at most|<=?|budget(?:\s+(?:of|is))?)\s*${MONEY}`)))) {
    filters.maxPrice = rent(m[1]);
  }
  if (filters.minPrice === null && (m = take(state, new RegExp(String.raw`(?:over|above|more than|at least|min(?:imum)?|from|>=?)\s*${MONEY}`)))) {
    filters.minPrice = rent(m[1]);
  }
  // A lone "$900" or "900/month" reads as a budget.
  if (filters.maxPrice === null && (m = take(state, new RegExp(String.raw`\$\s?(\d+(?:\.\d+)?k?)|(\d+(?:\.\d+)?k?)\s*(?:\/\s*mo(?:nth)?|a month|per month|monthly)`)))) {
    filters.maxPrice = rent(m[1] ?? m[2]);
  }
  if (filters.minPrice !== null && filters.maxPrice !== null && filters.minPrice > filters.maxPrice) {
    [filters.minPrice, filters.maxPrice] = [filters.maxPrice, filters.minPrice];
  }
  if (filters.minPrice !== null && filters.maxPrice !== null) understood.push(`$${filters.minPrice} to $${filters.maxPrice}`);
  else if (filters.maxPrice !== null) understood.push(`Under $${filters.maxPrice}`);
  else if (filters.minPrice !== null) understood.push(`Over $${filters.minPrice}`);

  for (const [pattern, type] of TYPE_WORDS) {
    if (take(state, pattern) && !filters.propertyTypes.includes(type)) {
      filters.propertyTypes.push(type);
      understood.push(PROPERTY_TYPE_LABELS[type]);
    }
  }

  if (take(state, /\b(?:unfurnished|not furnished)\b/)) filters.furnished = false;
  else if (take(state, /\bfurnished\b/)) filters.furnished = true;
  if (filters.furnished !== null) understood.push(filters.furnished ? "Furnished" : "Unfurnished");

  // "no pets" says nothing about the listing, so it's consumed and ignored.
  take(state, /\bno pets?\b/);
  if (take(state, /\b(?:pets? (?:allowed|friendly|ok|okay|welcome)|pet-friendly|allows? pets|(?:a|my|our|with|bring(?:ing)?) (?:dogs?|cats?|pets?))\b/)) {
    filters.petsAllowed = true;
    understood.push("Pets allowed");
  }

  for (const [pattern, amenity] of AMENITY_WORDS) {
    if (take(state, pattern) && !filters.amenities.includes(amenity)) {
      filters.amenities.push(amenity);
      understood.push(amenity);
    }
  }

  for (const [pattern, sort, label] of SORT_WORDS) {
    if (take(state, pattern)) {
      filters.sortBy = sort;
      understood.push(label);
      break;
    }
  }

  return { filters, radiusKm, understood };
}
