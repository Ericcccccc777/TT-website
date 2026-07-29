-- Migration: 0018_model_prices_seed
--
-- ⚠️ 本文件由 Token-Forest/tools/gen_model_prices_sql.py 生成,不要手改。
-- 价格的唯一事实源是 Token-Forest 的 src/dashboard/pricing.json;改价请改那里再重跑脚本。
--
-- 「树林价值榜」由服务端算,客户端只上传 token(见 0015)。美元若让客户端报,就多一个
-- 可伪造字段 —— 而且比伪造 token 省事得多:报 100 个 token 配 $99999,0016 那五条规则
-- 一条都管不到,它们只看 token 速率。服务端自己乘,作弊者就只能在 token 上作弊。
-- 附带:不上传新字段,所以隐私声明和 consent 都不用改。
--
-- 排名用**统一的当前价格**,不是各人收取当时的价格:两个用量相同的人,只因一个在降价前
-- 收的气泡就价值不同,对排名不公平。客户端 garden.value_usd() 用同一套口径,所以本地
-- 数字和榜上一致。
--
-- 查不到价的模型只计 token、不计钱。新模型永远比价格表先出现,它们照常进 token 榜;
-- 等这里补上价格,历史 token 自动获得价值 —— 因为价值是现算的,不是存死的。
--
-- 表结构与价值视图在手写的 0017 里;这里只有数据,改价重跑脚本即可。
-- ⚠️ 需在 Supabase SQL Editor 手动执行。幂等,可重复跑。假设 0017 已应用。


-- 价格数据(96 个模型,来自 pricing.json _updated=2026-07-22)──
-- 整表替换:删掉的模型要跟着消失,否则价值榜会一直按旧价算一个厂商已经下线的型号。
delete from public.model_prices;
insert into public.model_prices
  (model, provider, input, output, cache_read, cache_write_5m, cache_write_1h)
values
  ('claude-3-5-haiku', 'claude', 0.8, 4.0, 0.08, 1.0, 1.6),
  ('claude-3-5-sonnet', 'claude', 3.0, 15.0, 0.3, 3.75, 6.0),
  ('claude-3-haiku', 'claude', 0.25, 1.25, 0.03, 0.3, 0.5),
  ('claude-3-opus', 'claude', 15.0, 75.0, 1.5, 18.75, 30.0),
  ('claude-fable-5', 'claude', 10.0, 50.0, 1.0, 12.5, 20.0),
  ('claude-haiku-4-5', 'claude', 1.0, 5.0, 0.1, 1.25, 2.0),
  ('claude-mythos-5', 'claude', 10.0, 50.0, 1.0, 12.5, 20.0),
  ('claude-opus-4-0', 'claude', 15.0, 75.0, 1.5, 18.75, 30.0),
  ('claude-opus-4-1', 'claude', 15.0, 75.0, 1.5, 18.75, 30.0),
  ('claude-opus-4-5', 'claude', 5.0, 25.0, 0.5, 6.25, 10.0),
  ('claude-opus-4-6', 'claude', 5.0, 25.0, 0.5, 6.25, 10.0),
  ('claude-opus-4-7', 'claude', 5.0, 25.0, 0.5, 6.25, 10.0),
  ('claude-opus-4-8', 'claude', 5.0, 25.0, 0.5, 6.25, 10.0),
  ('claude-sonnet-4-5', 'claude', 3.0, 15.0, 0.3, 3.75, 6.0),
  ('claude-sonnet-4-6', 'claude', 3.0, 15.0, 0.3, 3.75, 6.0),
  ('claude-sonnet-5', 'claude', 3.0, 15.0, 0.3, 3.75, 6.0),
  ('gpt-5.3-codex', 'codex', 1.75, 14.0, 0.175, 0.0, 0.0),
  ('gpt-5.4', 'codex', 2.5, 15.0, 0.25, 0.0, 0.0),
  ('gpt-5.4-mini', 'codex', 0.75, 4.5, 0.075, 0.0, 0.0),
  ('gpt-5.4-nano', 'codex', 0.2, 1.25, 0.02, 0.0, 0.0),
  ('gpt-5.4-pro', 'codex', 30.0, 180.0, 0.0, 0.0, 0.0),
  ('gpt-5.5', 'codex', 5.0, 30.0, 0.5, 0.0, 0.0),
  ('gpt-5.5-pro', 'codex', 30.0, 180.0, 0.0, 0.0, 0.0),
  ('gpt-5.6-luna', 'codex', 1.0, 6.0, 0.1, 1.25, 0.0),
  ('gpt-5.6-sol', 'codex', 5.0, 30.0, 0.5, 6.25, 0.0),
  ('gpt-5.6-terra', 'codex', 2.5, 15.0, 0.25, 3.125, 0.0),
  ('gemini-2.5-flash-lite', 'gemini', 0.1, 0.4, 0.01, 0.0, 0.0),
  ('gemini-2.5-pro', 'gemini', 2.5, 15.0, 0.25, 0.0, 0.0),
  ('gemini-3.1-flash-lite', 'gemini', 0.25, 1.5, 0.025, 0.0, 0.0),
  ('gemini-3.1-pro', 'gemini', 2.0, 12.0, 0.2, 0.0, 0.0),
  ('gemini-3.5-flash', 'gemini', 1.5, 9.0, 0.15, 0.0, 0.0),
  ('grok-4.1-fast', 'grok', 0.2, 0.5, 0.0, 0.0, 0.0),
  ('grok-4.3', 'grok', 1.25, 2.5, 0.2, 0.0, 0.0),
  ('grok-4.5', 'grok', 2.0, 6.0, 0.5, 0.0, 0.0),
  ('grok-build-0.1', 'grok', 1.0, 2.0, 0.0, 0.0, 0.0),
  ('codestral', 'mistral', 0.3, 0.9, 0.0, 0.0, 0.0),
  ('ministral-3b', 'mistral', 0.04, 0.04, 0.0, 0.0, 0.0),
  ('ministral-8b', 'mistral', 0.1, 0.1, 0.0, 0.0, 0.0),
  ('mistral-large', 'mistral', 2.0, 6.0, 0.0, 0.0, 0.0),
  ('mistral-medium', 'mistral', 0.4, 2.0, 0.0, 0.0, 0.0),
  ('mistral-small', 'mistral', 0.1, 0.3, 0.0, 0.0, 0.0),
  ('command-a', 'cohere', 2.5, 10.0, 0.0, 0.0, 0.0),
  ('command-r', 'cohere', 0.15, 0.6, 0.0, 0.0, 0.0),
  ('command-r-plus', 'cohere', 2.5, 10.0, 0.0, 0.0, 0.0),
  ('command-r7b', 'cohere', 0.0375, 0.15, 0.0, 0.0, 0.0),
  ('deepseek-chat', 'deepseek', 0.14, 0.28, 0.0028, 0.0, 0.0),
  ('deepseek-reasoner', 'deepseek', 0.14, 0.28, 0.0028, 0.0, 0.0),
  ('deepseek-v4-flash', 'deepseek', 0.14, 0.28, 0.0028, 0.0, 0.0),
  ('deepseek-v4-pro', 'deepseek', 0.435, 0.87, 0.003625, 0.0, 0.0),
  ('kimi-k2.5', 'kimi', 0.6, 3.0, 0.1, 0.0, 0.0),
  ('kimi-k2.6', 'kimi', 0.95, 4.0, 0.16, 0.0, 0.0),
  ('kimi-k2.7-code', 'kimi', 0.95, 4.0, 0.19, 0.0, 0.0),
  ('kimi-k2.7-code-highspeed', 'kimi', 1.9, 8.0, 0.38, 0.0, 0.0),
  ('kimi-k3', 'kimi', 3.0, 15.0, 0.3, 0.0, 0.0),
  ('moonshot-v1-128k', 'kimi', 2.0, 5.0, 0.0, 0.0, 0.0),
  ('moonshot-v1-32k', 'kimi', 1.0, 3.0, 0.0, 0.0, 0.0),
  ('moonshot-v1-8k', 'kimi', 0.2, 2.0, 0.0, 0.0, 0.0),
  ('glm-4-32b-0414-128k', 'glm', 0.1, 0.1, 0.0, 0.0, 0.0),
  ('glm-4.5', 'glm', 0.6, 2.2, 0.11, 0.0, 0.0),
  ('glm-4.5-air', 'glm', 0.2, 1.1, 0.03, 0.0, 0.0),
  ('glm-4.5-airx', 'glm', 1.1, 4.5, 0.22, 0.0, 0.0),
  ('glm-4.5-flash', 'glm', 0.0, 0.0, 0.0, 0.0, 0.0),
  ('glm-4.5-x', 'glm', 2.2, 8.9, 0.45, 0.0, 0.0),
  ('glm-4.6', 'glm', 0.6, 2.2, 0.11, 0.0, 0.0),
  ('glm-4.7', 'glm', 0.6, 2.2, 0.11, 0.0, 0.0),
  ('glm-4.7-flash', 'glm', 0.0, 0.0, 0.0, 0.0, 0.0),
  ('glm-4.7-flashx', 'glm', 0.07, 0.4, 0.01, 0.0, 0.0),
  ('glm-5', 'glm', 1.0, 3.2, 0.2, 0.0, 0.0),
  ('glm-5-turbo', 'glm', 1.2, 4.0, 0.24, 0.0, 0.0),
  ('glm-5.1', 'glm', 1.4, 4.4, 0.26, 0.0, 0.0),
  ('glm-5.2', 'glm', 1.4, 4.4, 0.26, 0.0, 0.0),
  ('qwen-flash', 'qwen', 0.05, 0.4, 0.01, 0.0625, 0.0),
  ('qwen-max', 'qwen', 1.6, 6.4, 0.32, 2.0, 0.0),
  ('qwen-plus', 'qwen', 0.4, 1.2, 0.08, 0.5, 0.0),
  ('qwen-turbo', 'qwen', 0.05, 0.2, 0.01, 0.0, 0.0),
  ('qwen3-235b-a22b', 'qwen', 0.7, 2.8, 0.14, 0.875, 0.0),
  ('qwen3-coder-flash', 'qwen', 0.3, 1.5, 0.06, 0.375, 0.0),
  ('qwen3-coder-next', 'qwen', 1.0, 5.0, 0.2, 1.25, 0.0),
  ('qwen3-coder-plus', 'qwen', 1.0, 5.0, 0.2, 1.25, 0.0),
  ('qwen3-max', 'qwen', 1.2, 6.0, 0.24, 1.5, 0.0),
  ('qwen3.5-flash', 'qwen', 0.1, 0.4, 0.02, 0.125, 0.0),
  ('qwen3.6-flash', 'qwen', 0.25, 1.5, 0.05, 0.3125, 0.0),
  ('qwen3.7-max', 'qwen', 2.5, 7.5, 0.5, 3.125, 0.0),
  ('qwen3.7-plus', 'qwen', 0.4, 1.6, 0.08, 0.5, 0.0),
  ('minimax-m2', 'minimax', 0.3, 1.2, 0.03, 0.375, 0.0),
  ('minimax-m2.1', 'minimax', 0.3, 1.2, 0.03, 0.375, 0.0),
  ('minimax-m2.1-highspeed', 'minimax', 0.6, 2.4, 0.03, 0.0, 0.0),
  ('minimax-m2.5', 'minimax', 0.3, 1.2, 0.03, 0.375, 0.0),
  ('minimax-m2.5-highspeed', 'minimax', 0.6, 2.4, 0.03, 0.0, 0.0),
  ('minimax-m2.7', 'minimax', 0.3, 1.2, 0.06, 0.375, 0.0),
  ('minimax-m2.7-highspeed', 'minimax', 0.6, 2.4, 0.06, 0.0, 0.0),
  ('minimax-m3', 'minimax', 0.3, 1.2, 0.06, 0.0, 0.0),
  ('minimax-text-01', 'minimax', 0.2, 1.1, 0.0, 0.0, 0.0),
  ('mimo-v2.5', 'mimo', 0.14, 0.28, 0.0028, 0.0, 0.0),
  ('mimo-v2.5-pro', 'mimo', 0.435, 0.87, 0.0036, 0.0, 0.0),
  ('mimo-v2.5-pro-ultraspeed', 'mimo', 1.305, 2.61, 0.0108, 0.0, 0.0);

notify pgrst, 'reload schema';
