export async function wxNotify(title: string, desp?: string): Promise<void> {
  const key = process.env.SERVERCHAN_KEY;
  if (!key) return;
  try {
    await fetch(`https://sctapi.ftqq.com/${key}.send`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ title, ...(desp ? { desp } : {}) }),
    });
  } catch { /* 通知失败不影响主流程 */ }
}
