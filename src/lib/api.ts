// Get API URL from localStorage or fallback to default
function getApiUrl(): string {
  if (typeof window !== 'undefined') {
    const storedUrl = localStorage.getItem('d1_proxy_url');
    if (storedUrl && storedUrl.trim()) {
      return storedUrl.trim();
    }
  }
  // No fallback URL - user must configure their worker URL
  throw new Error('Worker URL not configured. Please set your worker URL in Settings.');
}

// Get token from localStorage
function getToken(): string | null {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('d1_token');
    return token && token.trim() ? token.trim() : null;
  }
  return null;
}

export async function execQuery(sql: string, params: unknown[] = []) {
  const baseUrl = getApiUrl();
  const apiUrl = `${baseUrl}/query`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params })
  });
  return res.json();
}

export async function execQueryProxy(sql: string, params: unknown[] = []) {
  const baseUrl = getApiUrl();
  const apiUrl = `${baseUrl}/query`;
  const res = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sql, params })
  });
  return res.json();
}

export async function uploadFile(file: File): Promise<{ url: string; fileName: string }> {
  const baseUrl = getApiUrl();
  const apiUrl = `${baseUrl}/upload`;
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const res = await fetch(apiUrl, {
      method: "POST",
      body: formData
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Upload failed: ${res.status} ${res.statusText} - ${errorText}`);
    }
    
    const result = await res.json();
    
    // Your worker returns { key, message }, we need to construct the URL
    const fileUrl = `${baseUrl}/object/${result.key}`;
    
    return {
      url: fileUrl,
      fileName: result.key
    };
  } catch (error) {
    throw error;
  }
}

export async function getPresignedUrl(fileKey: string): Promise<string> {
  const baseUrl = getApiUrl();
  const apiUrl = `${baseUrl}/presign?key=${encodeURIComponent(fileKey)}`;
  
  const res = await fetch(apiUrl, {
    method: "GET"
  });
  
  if (!res.ok) {
    throw new Error(`Failed to get presigned URL: ${res.statusText}`);
  }
  
  const result = await res.json();
  return result.url;
}


