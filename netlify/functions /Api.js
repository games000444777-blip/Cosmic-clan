const UPSTASH_URL = "https://talented-caribou-69877.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAARD1AAIncDE2Yjk4NGJkM2ViZTI0YTkyOTM2MTM4NzY0MzY1ODM5MHAxNjk4Nzc";

async function redis(cmd, ...args) {
  const res = await fetch(`${UPSTASH_URL}/${cmd}/${args.map(encodeURIComponent).join('/')}`, {
    headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
  });
  const data = await res.json();
  return data.result;
}

exports.handler = async (event) => {
  const p = event.queryStringParameters;
  const action = p.action;
  const nick = (p.nick || '').toLowerCase().trim();

  if (action === 'register') {
    if (!nick) return { statusCode: 200, body: JSON.stringify({ ok: false, msg: 'Пустой ник' }) };
    const existing = await redis('GET', `req:${nick}`);
    if (existing === 'approved') return { statusCode: 200, body: JSON.stringify({ ok: false, msg: 'Уже зарегистрирован' }) };
    await redis('SET', `req:${nick}`, 'pending');
    await redis('LPUSH', 'queue', nick);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (action === 'status') {
    const status = await redis('GET', `req:${nick}`);
    return { statusCode: 200, body: JSON.stringify({ status: status || 'pending' }) };
  }

  if (action === 'get_job') {
    const result = await redis('RPOP', 'queue');
    return { statusCode: 200, body: JSON.stringify({ nick: result || null }) };
  }

  if (action === 'set_res') {
    const status = p.status;
    if (!nick || !status) return { statusCode: 200, body: JSON.stringify({ ok: false }) };
    await redis('SET', `req:${nick}`, status);
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: false, msg: 'unknown action' }) };
};
