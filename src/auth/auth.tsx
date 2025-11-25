// // auth.ts
// import axios, { AxiosError, AxiosRequestConfig } from 'axios';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// const BASE_URL = 'http://192.168.1.3:3000/api/v1';

// // --- helpers ---
// const handleError = (err: any) => {
//   console.error('API Error:', err?.response?.status, err?.response?.data || err?.message);
//   if (err?.response?.data?.message) return { message: err.response.data.message, status: 'error' };
//   if (err?.response?.data?.error) return { message: err.response.data.error, status: 'error' };
//   return { message: 'Something went wrong', status: 'error' };
// };

// // remove extra quotes/whitespace and collapse double "Bearer "
// function sanitizeToken(raw?: string | null): string | null {
//   if (!raw) return null;
//   let t = String(raw).trim();

//   // strip wrapping quotes if present
//   if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
//     t = t.slice(1, -1);
//   }

//   // Collapse "Bearer Bearer " → single
//   if (t.toLowerCase().startsWith('bearer bearer ')) {
//     t = 'Bearer ' + t.slice(14);
//   }
//   return t.trim();
// }

// // Build preferred header (Bearer); callers can retry without Bearer if needed
// function buildBearerHeader(token?: string | null) {
//   if (!token) return {};
//   const t = sanitizeToken(token);
//   if (!t) return {};

//   if (t.toLowerCase().startsWith('bearer ')) {
//     return { Authorization: t };
//   }
//   return { Authorization: `Bearer ${t}` };
// }

// // Alternative header styles used as a fallback once on 401/invalid-token
// function buildRawHeader(token?: string | null) {
//   const t = sanitizeToken(token);
//   if (!t) return {};
//   return { Authorization: t }; // no Bearer prefix
// }
// function buildXAccessHeader(token?: string | null) {
//   const t = sanitizeToken(token);
//   if (!t) return {};
//   return { 'x-access-token': t };
// }

// // --- axios instance ---
// const api = axios.create({
//   baseURL: BASE_URL,
// });

// // tiny logger that does NOT print the full token
// function logAuthHeader(headers: Record<string, any> | undefined, label: string) {
//   const auth = headers?.Authorization || headers?.authorization || headers?.['x-access-token'];
//   if (!auth) {
//     console.log(`[auth] ${label}: no auth header`);
//     return;
//   }
//   const preview = String(auth).slice(0, 24) + '...';
//   console.log(`[auth] ${label}:`, preview);
// }

// interface ApiRequestParams {
//   url: string;
//   method?: AxiosRequestConfig['method'];
//   data?: any;
//   token?: string | null | undefined;
//   contentType?: string;
//   // internal use: avoid infinite retry loop
//   __triedFallbacks?: boolean;
// }

// // Core request with automatic fallback on “invalid token”
// export async function apiRequest({
//   url,
//   method = 'get',
//   data = null,
//   token = null,
//   contentType = 'application/json',
//   __triedFallbacks = false,
// }: ApiRequestParams) {
//   try {
//     const config: AxiosRequestConfig = {
//       method,
//       url: `/${url}`,
//       headers: {
//         ...buildBearerHeader(token),
//         ...(contentType && { 'Content-Type': contentType }),
//       },
//     };
//     if (data !== null && typeof data === 'object') config.data = data;

//     logAuthHeader(config.headers as any, 'primary'); // log preview
//     const res = await api.request(config);
//     return { data: res.data, status: 'success' };
//   } catch (err) {
//     const axErr = err as AxiosError<any>;
//     const msg = axErr?.response?.data?.message || axErr?.response?.data?.error || '';
//     const code = axErr?.response?.status;

//     // If token looks invalid, try fallback header styles exactly once
//     const looksLikeInvalidToken =
//       code === 401 ||
//       /invalid token/i.test(msg) ||
//       /unauthorized/i.test(msg) ||
//       /jwt/i.test(msg);

//     if (!__triedFallbacks && token && looksLikeInvalidToken) {
//       try {
//         // Try raw Authorization (no Bearer)
//         const cfgRaw: AxiosRequestConfig = {
//           method,
//           url: `/${url}`,
//           headers: {
//             ...buildRawHeader(token),
//             ...(contentType && { 'Content-Type': contentType }),
//           },
//           ...(data !== null && typeof data === 'object' ? { data } : {}),
//         };
//         logAuthHeader(cfgRaw.headers as any, 'fallback: raw Authorization');
//         const r1 = await api.request(cfgRaw);
//         return { data: r1.data, status: 'success' };
//       } catch (err2) {
//         // Try x-access-token
//         try {
//           const cfgX: AxiosRequestConfig = {
//             method,
//             url: `/${url}`,
//             headers: {
//               ...buildXAccessHeader(token),
//               ...(contentType && { 'Content-Type': contentType }),
//             },
//             ...(data !== null && typeof data === 'object' ? { data } : {}),
//           };
//           logAuthHeader(cfgX.headers as any, 'fallback: x-access-token');
//           const r2 = await api.request(cfgX);
//           return { data: r2.data, status: 'success' };
//         } catch (err3) {
//           // fall through to normal handler
//         }
//       }
//     }

//     return handleError(err);
//   }
// }

// // Convenience wrappers
// export async function AuthFetch(url: string, token?: string | null) {
//   return apiRequest({ url, method: 'get', token });
// }
// export async function AuthPost(url: string, body: any, token?: string | null) {
//   return apiRequest({ url, method: 'post', data: body, token });
// }
// export async function AuthPut(url: string, body: any, token?: string | null) {
//   return apiRequest({ url, method: 'put', data: body, token });
// }
// export async function UpdateFiles(url: string, body: any, token?: string | null) {
//   return apiRequest({ url, method: 'put', data: body, token, contentType: 'multipart/form-data' });
// }
// export async function UploadFiles(url: string, body: any, token?: string | null) {
//   return apiRequest({ url, method: 'post', data: body, token, contentType: 'multipart/form-data' });
// }
// export async function UsePost(url: string, body: any) {
//   return apiRequest({ url, method: 'post', data: body });
// }
// export async function authDelete(url: string, body: any, token: string) {
//   return apiRequest({ url, method: 'delete', data: body, token });
// }
// auth.ts
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// const BASE_URL = 'http://65.2.126.190:3000/api/v1';
const BASE_URL = 'http://192.168.1.3:3000/api/v1';

// --- helpers ---
const handleError = (err: any) => {
  if (err?.response?.data?.message) return { message: err.response.data.message, status: 'error' };
  if (err?.response?.data?.error) return { message: err.response.data.error, status: 'error' };
  return { message: 'Something went wrong', status: 'error' };
};

// remove extra quotes/whitespace and collapse double "Bearer "
function sanitizeToken(raw?: string | null): string | null {
  if (!raw) return null;
  let t = String(raw).trim();

  // strip wrapping quotes if present
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    t = t.slice(1, -1);
  }

  // Collapse "Bearer Bearer " → single
  if (t.toLowerCase().startsWith('bearer bearer ')) {
    t = 'Bearer ' + t.slice(14);
  }
  return t.trim();
}

// Build preferred header (Bearer); callers can retry without Bearer if needed
function buildBearerHeader(token?: string | null) {
  if (!token) return {};
  const t = sanitizeToken(token);
  if (!t) return {};
  if (t.toLowerCase().startsWith('bearer ')) {
    return { Authorization: t };
  }
  return { Authorization: `Bearer ${t}` };
}

// Alternative header styles used as a fallback once on 401/invalid-token
function buildRawHeader(token?: string | null) {
  const t = sanitizeToken(token);
  if (!t) return {};
  return { Authorization: t }; // no Bearer prefix
}
function buildXAccessHeader(token?: string | null) {
  const t = sanitizeToken(token);
  if (!t) return {};
  return { 'x-access-token': t };
}

// --- axios instance ---
const api = axios.create({
  baseURL: BASE_URL,
});

// tiny logger that does NOT print the full token
function logAuthHeader(headers: Record<string, any> | undefined, label: string) {
  const auth = headers?.Authorization || headers?.authorization || headers?.['x-access-token'];
  if (!auth) {
    console.log(`[auth] ${label}: no auth header`);
    return;
  }
  const preview = String(auth).slice(0, 24) + '...';
  console.log(`[auth] ${label}:`, preview);
}

interface ApiRequestParams {
  url: string;
  method?: AxiosRequestConfig['method'];
  data?: any;
  token?: string | null | undefined;
  contentType?: string;
  // internal use: avoid infinite retry loop
  __triedFallbacks?: boolean;
  authStyle?: 'bearer' | 'raw' | 'x';
}

/** Normalize RN FormData file parts to avoid "Network Error" */
function normalizeRNFormData(formData: any) {
  if (!formData || !Array.isArray(formData?._parts)) return formData;

  formData._parts = formData._parts.map((entry: any) => {
    // entry is [key, value]
    if (!Array.isArray(entry) || entry.length < 2) return entry;
    const [key, val] = entry;

    // Only touch possible file parts
    if (val && typeof val === 'object' && ('uri' in val || 'path' in val)) {
      const uriRaw = (val.uri ?? val.path) as string;
      if (!uriRaw) return entry;

      // Ensure proper uri scheme
      const fixedUri =
        uriRaw.startsWith('file://') || uriRaw.startsWith('content://')
          ? uriRaw
          : `file://${uriRaw}`;

      // Ensure name/type exist
      const name =
        val.name ||
        val.fileName ||
        (fixedUri.split('/').pop() || 'upload.bin');

      const type = val.type || 'application/octet-stream';

      return [key, { uri: fixedUri, name, type } as any];
    }

    return entry;
  });

  return formData;
}

// Core request with automatic fallback on "invalid token"
export async function apiRequest({
  url,
  method = 'get',
  data = null,
  token = null,
  
  contentType = 'application/json',
  __triedFallbacks = false,
  authStyle,
}: ApiRequestParams) {
  const isMultipart =
    contentType === 'multipart/form-data' ||
    (typeof FormData !== 'undefined' && data && typeof (data as any).append === 'function');

  try {
    // If multipart and we have RN FormData, normalize file parts in-place
    if (isMultipart && data && Array.isArray((data as any)?._parts)) {
      normalizeRNFormData(data);
    }

    // --- headers (primary) ---
    const headers: Record<string, any> = {};
    switch (authStyle) {
      case 'raw':
        Object.assign(headers, buildRawHeader(token));
        break;
      case 'x':
        Object.assign(headers, buildXAccessHeader(token));
        break;
      default:
        Object.assign(headers, buildBearerHeader(token));
        break;
    }

    if (isMultipart) {
      // Explicit content type works better with some stacks
      headers['Content-Type'] = 'multipart/form-data';
      headers['Accept'] = 'application/json';
    } else {
      headers['Content-Type'] = contentType;
    }

    const config: AxiosRequestConfig = {
      method,
      url: `/${url}`,
      headers,
      ...(isMultipart ? { transformRequest: v => v } : {}),
      maxContentLength: Infinity as any,
      maxBodyLength: Infinity as any,
    };

    if (data !== null && typeof data === 'object') config.data = data;

    logAuthHeader(config.headers as any, 'primary');
    const res = await api.request(config);
    return { data: res.data, status: 'success' };
  } catch (err) {
    const axErr = err as AxiosError<any>;
    const msg = axErr?.response?.data?.message || axErr?.response?.data?.error || '';
    const code = axErr?.response?.status;

    // If token looks invalid, try fallback header styles exactly once
    const looksLikeInvalidToken =
      code === 401 ||
      /invalid token/i.test(msg) ||
      /unauthorized/i.test(msg) ||
      /jwt/i.test(msg);

    if (!__triedFallbacks && token && looksLikeInvalidToken) {
      try {
        // fallback 1: raw Authorization
        const headersRaw: Record<string, any> = { ...buildRawHeader(token) };
        if (isMultipart) {
          headersRaw['Content-Type'] = 'multipart/form-data';
          headersRaw['Accept'] = 'application/json';
        } else {
          headersRaw['Content-Type'] = contentType;
        }

        const cfgRaw: AxiosRequestConfig = {
          method,
          url: `/${url}`,
          headers: headersRaw,
          ...(data !== null && typeof data === 'object' ? { data } : {}),
          ...(isMultipart ? { transformRequest: v => v } : {}),
          maxContentLength: Infinity as any,
          maxBodyLength: Infinity as any,
        };
        logAuthHeader(cfgRaw.headers as any, 'fallback: raw Authorization');
        const r1 = await api.request(cfgRaw);
        return { data: r1.data, status: 'success' };
      } catch (err2) {
        try {
          // fallback 2: x-access-token
          const headersX: Record<string, any> = { ...buildXAccessHeader(token) };
          if (isMultipart) {
            headersX['Content-Type'] = 'multipart/form-data';
            headersX['Accept'] = 'application/json';
          } else {
            headersX['Content-Type'] = contentType;
          }

          const cfgX: AxiosRequestConfig = {
            method,
            url: `/${url}`,
            headers: headersX,
            ...(data !== null && typeof data === 'object' ? { data } : {}),
            ...(isMultipart ? { transformRequest: v => v } : {}),
            maxContentLength: Infinity as any,
            maxBodyLength: Infinity as any,
          };
          logAuthHeader(cfgX.headers as any, 'fallback: x-access-token');
          const r2 = await api.request(cfgX);
          return { data: r2.data, status: 'success' };
        } catch (err3) {
          // fall through to normal handler
        }
      }
    }

    return handleError(err);
  }
}

// Convenience wrappers
export async function AuthFetch(url: string, token?: string | null) {
  return apiRequest({ url, method: 'get', token, });
}

export async function AuthPost(url: string, body: any, token?: string | null) {
  return apiRequest({
    url,
    method: 'post',
    data: body,
    token,
    authStyle: 'raw', // same as your web authPost
    contentType: 'application/json',
  });
}

export async function UploadFiles(url: string, body: any, token?: string | null) {
  return apiRequest({
    url,
    method: 'post',
    data: body,
    token,
    authStyle: 'raw',
    contentType: 'multipart/form-data',
  });
}

export async function AuthPut(url: string, body: any, token?: string | null) {
  return apiRequest({ url,
    method: 'put',
    data: body,
    token,
    authStyle: 'raw', // same as your web authPost
    contentType: 'application/json', });
}

export async function AuthPatch(url: string, body: any, token?: string | null) {
  return apiRequest({ url, method: 'patch', data: body, token, authStyle: 'raw', // same as your web authPost
    contentType: 'application/json', });
}

export async function UpdateFiles(url: string, body: any, token?: string | null) {
  return apiRequest({
    url,
    method: 'patch',
    data: body,
    token,
    authStyle: 'raw',
    contentType: 'multipart/form-data',
  });
}

export async function UsePost(url: string, body: any) {
  return apiRequest({ url, method: 'post', data: body });
}

// export async function authDelete(url: string, body: any, token: string) {
//   return apiRequest({ url, method: 'delete', data: body, token });
// }
export async function AuthDelete(url: string, token?: string | null) {
  return apiRequest({
    url,
    method: 'delete',
    token,
    data: undefined,    // ensures NO body
    contentType: 'application/json',
    authStyle: 'bearer'
  });
}
