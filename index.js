
const puppeteer = require('puppeteer');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;

const CSV_FILE_NAME = 'Report.csv';



const csvWriter = createCsvWriter({
    path: CSV_FILE_NAME,
    header: [
        { id: 'CONTRACT_NAME', title: 'Contract Name' },
        { id: 'PERCENTAGE_CHANGE', title: '% Change' },
        { id: 'VOLUME', title: 'Volume' },
    ]
});

(async function () {
    const OPTION_TAB_X = '//*[@id="quote-nav"]/ul/li[10]';

    const columns = {
        CONTRACT_NAME: 0,
        LAST_TRADE_DATE: 1,
        STRIKE: 2,
        LAST_PRICE: 3,
        BID: 4,
        ASK: 5,
        CHANGE: 6,
        PERCENTAGE_CHANGE: 7,
        VOLUME: 8,
        OPEN_INTEREST: 9,
        IMPLIED_VOLATILY: 10
    }

    const browser = await puppeteer.launch();

    const page = await browser.newPage();

    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/78.0.3904.108 Safari/537.36');

    await page.setViewport({ width: 1366, height: 768 });

    await page.goto('https://finance.yahoo.com/quote/SONO?p=SONO');
    const el = await page.$x(OPTION_TAB_X);
    el[0].click()
    console.log('Tab options Clicked');

    setTimeout(async function () {
        const PERCENTAGE_LIMIT = 100;
        const { PERCENTAGE_CHANGE } = columns
        const data = await page.evaluate(() => {
            const TABLE_ROW_SELECTOR = '#Col1-1-OptionContracts-Proxy > section > section:nth-child(2) > div:nth-child(2) > div > table > tbody > tr.data-row';
            const TABLE_SELECTOR = '#Col1-1-OptionContracts-Proxy > section > section:nth-child(2) > div:nth-child(2) > div > table > tbody';
            const countRows = document.querySelector(TABLE_SELECTOR).querySelectorAll('tr').length;
            let rows = [];
            for (let index = 0; index < countRows; index++) {
                const td = [];
                [...document.querySelectorAll(TABLE_ROW_SELECTOR + index)].map(tr => {
                    return [...tr.querySelectorAll('td')].map(item => td.push(item.innerText))
                })
                rows = [...rows, { [index]: td }];
            }
            return rows;
        });
        let result = []
        data.map((item, index) => {
            item[index].map((it, indexItem) => {
                if (indexItem === PERCENTAGE_CHANGE) {
                    const percentage = it.split('%')[0]
                    if (percentage > PERCENTAGE_LIMIT) {
                        result.push(item[index]);
                    }
                }
            })
        });
        result = result.map((item) => {
            let finalObj = {};
            item.map((it, indexIt) => (finalObj = { ...finalObj, ...{ [Object.keys(columns)[indexIt]]: it } }));
            return finalObj;
        });
        if (result.length) {
            result = result.sort((a, b) => {
                const percentageA = a.PERCENTAGE_CHANGE.split('%')[0];
                const percentageB = b.PERCENTAGE_CHANGE.split('%')[0];
                return (percentageA - percentageB)
            });
        }
        console.log('Will try to write the csv file');
        await csvWriter.writeRecords(result);
        console.log('CSV Created successfully file: ' + CSV_FILE_NAME);
        await page.screenshot({ path: 'screenshot.png', fullPage: true });
        console.log('Screenshot created');
        await browser.close();

    }, 2000)

})();

