import { TypedUseSelectorHook, useDispatch, useSelector } from "react-redux";
import type { AppDispatch, RootState } from "./index";

/**
 * Typed version of useDispatch.
 * Returns AppDispatch (which knows about thunks) instead of the generic Dispatch<AnyAction>.
 * Import this everywhere instead of plain useDispatch().
 */
export const useAppDispatch = () => useDispatch<AppDispatch>();

/**
 * Typed version of useSelector.
 * Infers state shape from RootState so selectors are type-safe without manual annotation.
 * Import this everywhere instead of plain useSelector().
 *
 * Usage:
 *   const accounts = useAppSelector(state => state.accounts.items);
 *   //    ^ AccountDetails[]  — inferred automatically
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
