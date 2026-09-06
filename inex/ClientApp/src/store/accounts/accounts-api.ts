import { createApi } from "@reduxjs/toolkit/query/react";

import axiosBaseQuery from "../axiosBaseQuery";

interface ListResponse<T> {
  data: T[];
}

export interface AccountResponse {
  id: number;
  key: string;
  name: string;
  description: string | null;
  isEnabled: boolean;
  isFavourite: boolean;
  currencyId: number;
  currency: string;
}

export interface AccountSummary extends AccountResponse {
  value: number;
  thisMonthNet: number;
}

interface CreateAccountArgs {
  key: string;
  name: string;
  description: string;
  currencyId: number;
  isEnabled: boolean;
  isFavourite: boolean;
}

interface UpdateAccountArgs extends CreateAccountArgs {
  id: number;
}

function buildAccountsSummaryUrl(ids: number[]): string {
  const idsQuery = ids.map((id, i) => `ids[${i}]=${id}`).join("&");
  return `/accounts/details?mode=active&${idsQuery}`;
}

export const accountsApi = createApi({
  reducerPath: "accountsApi",
  baseQuery: axiosBaseQuery,
  tagTypes: ["Account"],
  endpoints: (builder) => ({
    getAccounts: builder.query<AccountResponse[], string>({
      query: (mode) => ({ url: `/accounts?mode=${mode}` }),
      transformResponse: (response: ListResponse<AccountResponse>) =>
        response.data ?? [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Account" as const, id })),
              { type: "Account", id: "LIST" },
            ]
          : [{ type: "Account", id: "LIST" }],
    }),
    getAccountsSummary: builder.query<AccountSummary[], number[]>({
      query: (ids) => ({ url: buildAccountsSummaryUrl(ids) }),
      transformResponse: (response: ListResponse<AccountSummary>) =>
        response.data ?? [],
      providesTags: (result) =>
        result
          ? [
              ...result.map(({ id }) => ({ type: "Account" as const, id })),
              { type: "Account", id: "SUMMARY" },
            ]
          : [{ type: "Account", id: "SUMMARY" }],
    }),
    createAccount: builder.mutation<void, CreateAccountArgs>({
      query: (body) => ({ url: "/accounts", method: "post", data: body }),
      invalidatesTags: [{ type: "Account", id: "LIST" }],
    }),
    updateAccount: builder.mutation<void, UpdateAccountArgs>({
      query: ({ id, ...body }) => ({
        url: `/accounts/${id}`,
        method: "put",
        data: { id, ...body },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: "Account" as const, id },
        { type: "Account", id: "LIST" },
      ],
    }),
    deleteAccount: builder.mutation<void, number>({
      query: (id) => ({ url: `/accounts/${id}`, method: "delete" }),
      invalidatesTags: (result, error, id) => [
        { type: "Account" as const, id },
        { type: "Account", id: "LIST" },
      ],
    }),
  }),
});

export const {
  useGetAccountsQuery,
  useGetAccountsSummaryQuery,
  useCreateAccountMutation,
  useUpdateAccountMutation,
  useDeleteAccountMutation,
} = accountsApi;
