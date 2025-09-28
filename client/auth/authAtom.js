import { atom } from "jotai"
import config from "../config"

const _tokenAtom = atom(localStorage.getItem(config.tokenName) || "")

export const tokenAtom = atom(
  (get) => get(_tokenAtom),
  (_, set, newToken) => {
    localStorage.setItem(config.tokenName, newToken)
    set(_tokenAtom, newToken)
  }
)
