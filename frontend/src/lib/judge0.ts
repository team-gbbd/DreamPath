// Judge0 API 통합
// RapidAPI Judge0 사용: https://rapidapi.com/judge0-official/api/judge0-ce

const JUDGE0_API_URL = 'https://judge0-ce.p.rapidapi.com';
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || 'demo-key'; // .env에 설정 필요

export interface SubmissionResult {
  status: {
    id: number;
    description: string;
  };
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  time?: string;
  memory?: number;
}

// 언어 ID 매핑
export const LANGUAGE_IDS = {
  javascript: 63, // Node.js
  python: 71,     // Python 3
  java: 62,       // Java
  cpp: 54,        // C++ (GCC 9.2.0)
};

/**
 * UTF-8 문자열을 Base64로 안전하게 인코딩
 */
function utf8ToBase64(str: string): string {
  // TextEncoder를 사용하여 UTF-8 바이트로 변환
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);

  // 바이트 배열을 문자열로 변환
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  // Base64 인코딩
  return btoa(binary);
}

/**
 * Base64를 UTF-8 문자열로 안전하게 디코딩
 */
function base64ToUtf8(str: string | null | undefined): string {
  // null, undefined, 빈 문자열 체크
  if (!str || str.trim() === '') {
    return '';
  }

  try {
    // Base64 디코딩
    const binary = atob(str);

    // 바이너리 문자열을 바이트 배열로 변환
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // TextDecoder를 사용하여 UTF-8 문자열로 디코딩
    const decoder = new TextDecoder('utf-8');
    return decoder.decode(bytes);
  } catch (error) {
    console.error('Base64 디코딩 실패:', error);
    return str; // 디코딩 실패 시 원본 반환
  }
}

/**
 * 코드 제출 및 실행
 */
export async function submitCode(
  code: string,
  languageId: number,
  stdin: string = ''
): Promise<SubmissionResult> {
  try {
    const encodedCode = utf8ToBase64(code);
    const encodedStdin = stdin ? utf8ToBase64(stdin) : '';


    // 1. 코드 제출 (Base64 인코딩 + base64_encoded 플래그)
    const submitResponse = await fetch(`${JUDGE0_API_URL}/submissions?base64_encoded=true&wait=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-RapidAPI-Key': RAPIDAPI_KEY,
        'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com',
      },
      body: JSON.stringify({
        source_code: encodedCode,
        language_id: languageId,
        stdin: encodedStdin,
      }),
    });

    if (!submitResponse.ok) {
      throw new Error('코드 제출 실패');
    }

    const result = await submitResponse.json();

    // Base64 디코딩 (UTF-8 안전)
    if (result.stdout) {
      result.stdout = base64ToUtf8(result.stdout);
    }
    if (result.stderr) {
      result.stderr = base64ToUtf8(result.stderr);
    }
    if (result.compile_output) {
      result.compile_output = base64ToUtf8(result.compile_output);
    }

    return result;
  } catch (error) {
    console.error('Judge0 에러:', error);
    throw error;
  }
}

/**
 * 로컬 JavaScript 실행 (Judge0 없이 테스트용)
 */
export function runJavaScriptLocally(code: string, stdin: string = ''): SubmissionResult {
  try {
    // console.log를 캡처
    const logs: string[] = [];
    const originalLog = console.log;
    console.log = (...args: any[]) => {
      logs.push(args.map(String).join(' '));
    };

    // stdin을 전역 변수로 제공
    (window as any).__stdin = stdin.split('\n');
    (window as any).__stdinIndex = 0;

    // readline 함수 제공 (간단 버전)
    const readline = () => {
      const lines = (window as any).__stdin;
      const index = (window as any).__stdinIndex;
      if (index < lines.length) {
        (window as any).__stdinIndex++;
        return lines[index];
      }
      return '';
    };

    // 코드 실행
    const wrappedCode = `
      const readline = ${readline.toString()};
      ${code}
    `;

    eval(wrappedCode);

    // console.log 복원
    console.log = originalLog;

    return {
      status: { id: 3, description: 'Accepted' },
      stdout: logs.join('\n'),
      time: '0.001',
      memory: 0,
    };
  } catch (error) {
    console.log = console.log; // 복원
    return {
      status: { id: 6, description: 'Compilation Error' },
      stderr: error.message,
    };
  }
}
