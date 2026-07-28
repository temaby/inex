import type { BaseQueryFn } from "@reduxjs/toolkit/query";
import type { AxiosError, AxiosRequestConfig } from "axios";

import apiClient from "../utils/apiClient";

export interface AxiosBaseQueryArgs {
  url: string;
  method?: AxiosRequestConfig["method"];
  data?: AxiosRequestConfig["data"];
  params?: AxiosRequestConfig["params"];
}

export interface AxiosBaseQueryError {
  status?: number;
  data: unknown;
}

const axiosBaseQuery: BaseQueryFn<
  AxiosBaseQueryArgs,
  unknown,
  AxiosBaseQueryError
> = async ({ url, method = "get", data, params }, api) => {
  try {
    const result = await apiClient({ url, method, data, params, signal: api.signal });
    return { data: result.data ?? null };
  } catch (axiosError) {
    const err = axiosError as AxiosError;
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data ?? err.message,
      },
    };
  }
};

export default axiosBaseQuery;
