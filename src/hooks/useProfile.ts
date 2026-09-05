import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Profile } from "../types";
import type { StatusMessageApi } from "./useStatusMessage";

export function useProfile(status: StatusMessageApi) {
  const [profile, setProfile] = useState<Profile>({ name: "", email: "" });

  async function fetchProfile() {
    await status.run("Loading profile...", () => invoke<Profile>("get_profile"), setProfile);
  }

  async function saveProfile(name: string, email: string) {
    const ok = await status.run("Saving profile...", () =>
      invoke("set_profile", { name, email })
    );
    if (ok !== undefined) setProfile({ name, email });
  }

  return { profile, fetchProfile, saveProfile };
}
