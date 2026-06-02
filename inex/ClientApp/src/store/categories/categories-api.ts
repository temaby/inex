import { createApi } from "@reduxjs/toolkit/query/react";

import axiosBaseQuery from "../axiosBaseQuery";

interface ListResponse<T> {
  data: T[];
}

export interface CategoryResponse {
  id: number;
  key: string;
  name: string;
  description: string | null;
  parentId?: number | null;
  isEnabled: boolean;
  isSystem: boolean;
  systemCode: string | null;
  children?: CategoryResponse[];
}

interface CreateCategoryArgs {
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
  parentId: number | null;
}

interface UpdateCategoryArgs {
  id: number;
  key: string;
  name: string;
  description: string;
  isEnabled: boolean;
}

export const categoriesApi = createApi({
  reducerPath: "categoriesApi",
  baseQuery: axiosBaseQuery,
  tagTypes: ["Category"],
  endpoints: (builder) => ({
    getCategories: builder.query<CategoryResponse[], string>({
      query: (mode) => ({ url: `/categories?mode=${mode}` }),
      transformResponse: (response: ListResponse<CategoryResponse>) =>
        response.data ?? [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Category" as const, id })),
              { type: "Category", id: "LIST" },
            ]
          : [{ type: "Category", id: "LIST" }],
    }),
    createCategory: builder.mutation<void, CreateCategoryArgs>({
      query: (body) => ({ url: "/categories", method: "post", data: body }),
      invalidatesTags: [{ type: "Category", id: "LIST" }],
    }),
    updateCategory: builder.mutation<void, UpdateCategoryArgs>({
      query: ({ id, ...body }) => ({
        url: `/categories/${id}`,
        method: "put",
        data: { id, ...body },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Category" as const, id },
        { type: "Category", id: "LIST" },
      ],
    }),
    deleteCategory: builder.mutation<void, number>({
      query: (id) => ({ url: `/categories/${id}`, method: "delete" }),
      invalidatesTags: (result, error, id) => [
        { type: "Category" as const, id },
        { type: "Category", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetCategoriesQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoriesApi;
