# Deploy Notes

不要把 `.env` 上傳到 GitHub。

雲端部署時請設定環境變數：

- `DISCORD_TOKEN`
- `CLIENT_ID`
- `GUILD_ID`
- `DASHBOARD_PORT` 可不填

啟動：

```bash
npm install
npm start
```

註冊 Discord slash commands：

```bash
npm run register
```

如果使用 Render / Railway / Fly.io，服務類型請選 Background Worker / Worker。
