import categoriesSlice, { categoriesActions } from "./categories-slice";
import { createCategoryDetails } from "../../model/Category/CategoryDetails";

describe("categoriesSlice", () => {
  describe("setIsLoading", () => {
    it("sets isLoading to true", () => {
      const state = categoriesSlice.reducer(
        undefined,
        categoriesActions.setIsLoading({ isLoading: true }),
      );

      expect(state.isLoading).toBe(true);
    });

    it("sets isLoading to false", () => {
      const withLoading = categoriesSlice.reducer(
        undefined,
        categoriesActions.setIsLoading({ isLoading: true }),
      );
      const state = categoriesSlice.reducer(
        withLoading,
        categoriesActions.setIsLoading({ isLoading: false }),
      );

      expect(state.isLoading).toBe(false);
    });
  });

  describe("setCategories", () => {
    it("replaces the items array with the provided payload", () => {
      const mockCategories = [
        createCategoryDetails({
          id: 1,
          key: "food",
          name: "Food",
          isEnabled: true,
        }),
      ];

      const state = categoriesSlice.reducer(
        undefined,
        categoriesActions.setCategories({ items: mockCategories }),
      );

      expect(state.items).toHaveLength(1);
      expect(state.items[0].key).toBe("food");
    });

    it("initial state has empty items array", () => {
      const state = categoriesSlice.reducer(undefined, { type: "@@INIT" });

      expect(state.items).toEqual([]);
    });
  });
});
