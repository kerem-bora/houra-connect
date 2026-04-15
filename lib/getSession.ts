import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { SessionData, sessionOptions } from "./session";

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}