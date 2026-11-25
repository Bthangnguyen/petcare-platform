/**
 * RatingReader (SAD, section 4.8, ReviewRatingReader): the average rating of a facility, used by the search (UC06) and the facility page.
 * Until UC20 is built, app.ts gives the other modules NoRatings; the owner of UC20 replaces it by the real service.
 */
export interface RatingSummary {
  /** average of the published reviews, null when there is no review */
  average: number | null;
  count: number;
}

export interface RatingReader {
  getRatingSummary(facilityId: string): RatingSummary;
}

export class NoRatings implements RatingReader {
  getRatingSummary(_facilityId: string): RatingSummary {
    return { average: null, count: 0 };
  }
}
