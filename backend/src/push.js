export async function sendRunNotification(subscription, run) {
  // Placeholder for real Web Push provider integration.
  // Next step: replace with `web-push` library and VAPID keys.
  const payload = {
    title: run.status === 'completed' ? 'Codex finished' : 'Codex finished with issues',
    body: run.summaryShort,
    tag: `run:${run.id}`,
    url: `/r/${run.runToken}`
  };

  console.log('Push notification queued', {
    endpoint: subscription.endpoint,
    payload
  });

  return { ok: true };
}
