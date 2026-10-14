export type RepToolsProfile = {
  fullName: string;
  email: string;
  phone: string;
  licenseNumber: string;
  brokerageName: string;
  headshotDataUrl: string;
  logoDataUrl: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  websiteUrl: string;
};

export const REP_TOOLS_PROFILE_KEY = "realty-edge-tools:profile:v1";

export const emptyRepToolsProfile: RepToolsProfile = {
  fullName: "",
  email: "",
  phone: "",
  licenseNumber: "",
  brokerageName: "",
  headshotDataUrl: "",
  logoDataUrl: "",
  streetAddress: "",
  city: "",
  state: "",
  zipCode: "",
  websiteUrl: "",
};

export function loadRepToolsProfile(): RepToolsProfile {
  if (typeof window === "undefined") return emptyRepToolsProfile;
  try {
    const raw = window.localStorage.getItem(REP_TOOLS_PROFILE_KEY);
    if (!raw) return emptyRepToolsProfile;
    return { ...emptyRepToolsProfile, ...(JSON.parse(raw) as Partial<RepToolsProfile>) };
  } catch {
    return emptyRepToolsProfile;
  }
}

export function saveRepToolsProfile(profile: RepToolsProfile) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(REP_TOOLS_PROFILE_KEY, JSON.stringify(profile));
}
