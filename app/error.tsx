"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ATLAS page render failed", error);
  }, [error]);

  return (
    <main className="error-state" role="alert">
      <p className="eyebrow">ATLAS GLOBAL INTELLIGENCE</p>
      <h1>本期报告暂时无法显示</h1>
      <p>生成数据未通过页面渲染，请稍后重试。</p>
      <button type="button" className="print-button" onClick={reset}>重新加载</button>
    </main>
  );
}
