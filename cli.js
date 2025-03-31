#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const inquirer = require("inquirer").default;

const srcFolderPath = path.join(process.cwd(), "src");
const axiosFolderPath = path.join(srcFolderPath, "axios");
const socketFolderPath = path.join(srcFolderPath, "socket");
const axiosFilePath = path.join(axiosFolderPath, "axios.tsx");
const socketFilePath = path.join(socketFolderPath, "socket.ts");

const axiosBoilerplate = `


import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import { toasts } from "../component/common/ui/Toast/Toast"; 
import { decryptData, encryptData, getKey } from "../utils/utils";  // import these keys fronm your compononet
import { ENCRYPTION_EXCLUDED, ENVIRONMENT } from "../utils/constants";
import { toast } from "react-toastify"; 

const BASE_URL: string | undefined = process.env.REACT_APP_API_HOST;
const key: string = getKey(50);

//* INSTANCE:
export const axiosApi: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

//* INTERCEPTORS:
// Request Interceptor
axiosApi.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token: string | null =
      localStorage.getItem("token") || localStorage.getItem("forgotPassToken");
    if (token) {
      config.headers = { ...config.headers, Authorization: \`Bearer \${token}\` };
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor
axiosApi.interceptors.response.use(
  (successResponse: AxiosResponse<any>) => {
    if (Number(ENVIRONMENT.ENABLE_ENCRYPTION)) {
      const decryptedData = decryptData(successResponse?.data?.resData);
      return {
        ...successResponse,
        data: decryptedData,
      };
    }
    return successResponse;
  },
  (errorResponse: AxiosResponse<any>) => {
    if (Number(ENVIRONMENT.ENABLE_ENCRYPTION)) {
      const decryptedData = decryptData(errorResponse?.response?.data?.resData);
      handleError(decryptedData);
      throw decryptedData;
    } else {
      handleError(errorResponse);
      throw errorResponse;
    }
  }
);

// Format URL with Query Params
type Params = Record<string, string | number>;
const formatUrl = (url: string, params?: Params): string => {
  return params && Object.keys(params).length > 0
    ? \`\${url}?\${new URLSearchParams(params as Record<string, string>).toString()}\`
    : url;
};

const clearWaitingQueue = (): void => {
  toast.clearWaitingQueue();
};

// Handle Error
function handleError(error: any): void {
  const errorStatus: number | undefined = error?.response?.status || error?.status;
  const errorMessage: string | undefined =
    error?.response?.data?.message || error?.data?.message || error?.message;

  if (errorStatus && (errorStatus === 403 || errorStatus === 401)) {
    toasts.error("Please re-login, last login session expired.");
    localStorage.clear();
    window.dispatchEvent(new Event("storage"));
    clearWaitingQueue();
  } else {
    if (errorMessage) toasts.error(errorMessage);
    clearWaitingQueue();
  }
}

// Handle Success
function handleSuccess<T>(res: AxiosResponse<T>): void {
  if (res?.status === 200 || res?.status === 201) {
    const message = (res.data as any)?.message;
    if (message) toasts.success(message);
  }
  if (res?.status === 403 || res?.status === 400) {
    const message = (res.data as any)?.message;
    if (message) toasts.warning(message);
  }
}

// Get Payload Data
const getPayloadData = (data: unknown, url: string = ""): unknown => {
  if (data) {
    if (Number(ENVIRONMENT.ENABLE_ENCRYPTION)) {
      return ENCRYPTION_EXCLUDED.includes(url) ? data : { reqData: encryptData(data) };
    }
    return data;
  }
  return null;
};

//* HTTP METHODS
type ApiCallResponse<T> = Promise<T>;

export const apiCallGet = async <T>(
  url: string,
  params: Params = {},
  toastOn?: boolean
): ApiCallResponse<T> => {
  try {
    const res = await axiosApi.get<T>(formatUrl(url, params));
    if (toastOn) handleSuccess(res);
    return res.data;
  } catch (error: any) {
    return error?.response?.data;
  }
};

export const apiCallPost = async <T>(
  url: string,
  data: unknown,
  params: Params = {},
  toastOn?: boolean,
  header?: Record<string, string>
): ApiCallResponse<T> => {
  try {
    const res = await axiosApi.post<T>(formatUrl(url, params), getPayloadData(data, url), { headers: header });
    if (toastOn) handleSuccess(res);
    return res.data;
  } catch (error: any) {
    return error?.response?.data;
  }
};

export const apiCallPatch = async <T>(
  url: string,
  data: unknown,
  params: Params = {},
  toastOn?: boolean
): ApiCallResponse<T> => {
  try {
    const res = await axiosApi.patch<T>(formatUrl(url, params), getPayloadData(data, url));
    if (toastOn) handleSuccess(res);
    return res.data;
  } catch (error: any) {
    return error?.response?.data;
  }
};

export const apiCallDelete = <T>(
  url: string,
  data: unknown,
  params: Params = {},
  toastOn?: boolean
): ApiCallResponse<T> => {
  return new Promise((resolve, reject) => {
    axiosApi
      .delete<T>(formatUrl(url, params), { data: getPayloadData(data, url) })
      .then((res) => {
        if (toastOn) handleSuccess(res);
        resolve(res.data);
      })
      .catch((error) => reject(error));
  });
};
`;

const socketBoilerplate = `import { io, Socket } from "socket.io-client";

const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || "http://localhost:4000";

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
});
`;

async function setupBoilerplate() {
  const answers = await inquirer.prompt([
    {
      type: "list",
      name: "setupChoice",
      message: "Which setup would you like to install?",
      choices: ["Axios", "Socket", "Both"],
    },
  ]);

  if (!fs.existsSync(srcFolderPath))
    fs.mkdirSync(srcFolderPath, { recursive: true });

  if (answers.setupChoice === "Axios" || answers.setupChoice === "Both") {
    if (!fs.existsSync(axiosFolderPath))
      fs.mkdirSync(axiosFolderPath, { recursive: true });
    fs.writeFileSync(axiosFilePath, axiosBoilerplate);
    console.log("✅ Axios setup created successfully!");
  }

  if (answers.setupChoice === "Socket" || answers.setupChoice === "Both") {
    if (!fs.existsSync(socketFolderPath))
      fs.mkdirSync(socketFolderPath, { recursive: true });
    fs.writeFileSync(socketFilePath, socketBoilerplate);
    console.log("✅ Socket setup created successfully!");
  }
}

setupBoilerplate();
