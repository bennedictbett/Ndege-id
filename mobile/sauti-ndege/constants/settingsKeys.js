// Shared AsyncStorage keys for local-only profile/settings data.
// Keeping these in one place avoids two screens drifting to different
// string literals for the same stored value (Profile writes these,
// Home/other screens read them).

export const TARGET_KEY = 'setting_life_list_target';
export const DISTANCE_UNIT_KEY = 'setting_distance_unit';
export const NOTIFICATIONS_KEY = 'setting_notifications_enabled';
export const NEARBY_BIRDS_KEY = 'setting_show_nearby_birds';
export const DISPLAY_NAME_KEY = 'profile_display_name';
export const BIO_KEY = 'profile_bio';
export const PHOTO_KEY = 'profile_photo_uri';
export const DEFAULT_LOCATION_KEY = 'profile_default_location';