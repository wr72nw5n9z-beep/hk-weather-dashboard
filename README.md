# 香港天氣控制台 · Hong Kong Weather Dashboard

純靜態網頁。瀏覽器直接讀取香港天文台 Open Data，顯示即時天氣同九天預報。數值照 API 原文顯示，唔會改寫或估算，亦冇建置步驟。

A static site. The browser reads the Hong Kong Observatory Open Data API and shows current conditions plus the 9-day forecast. Figures are displayed as returned. There is no build step.

## 資料來源 · Data sources

| 用途 Use | Endpoint |
| --- | --- |
| 即時天氣 Current weather (`rhrread`) | `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=tc` |
| 九天天氣預報 9-day forecast (`fnd`) | `https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=fnd&lang=tc` |

官方說明 Official docs: <https://data.weather.gov.hk/>

`app.js` 會一併讀呢兩個 endpoint，大約每 12 分鐘自動再拉一次。`app.js` fetches both endpoints and refreshes about every 12 minutes.

## 本地開啟 · Open locally

用 `file://` 開頁會被瀏覽器擋跨域請求，所以要喺呢個資料夾開一個靜態伺服器。Opening the files with `file://` blocks cross-origin requests, so serve this folder:

```bash
python3 -m http.server 4177
```

然後開 Then open <http://127.0.0.1:4177/>。

## GitHub Pages

網站由 `main` 分支根目錄（`/`）發佈。GitHub Pages serves the root of the `main` branch.

<https://wr72nw5n9z-beep.github.io/hk-weather-dashboard/>

## 檔案 · Files

- `index.html` — 版面 Page
- `styles.css` — 樣式 Styles
- `app.js` — 讀取 `rhrread` 同 `fnd` Fetches `rhrread` and `fnd`
