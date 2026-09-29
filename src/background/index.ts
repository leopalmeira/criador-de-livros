import { db } from '../database/local-database';
import { defaultSalesEstimator } from '../estimators/sales-estimation-model';
import { defaultRoyaltyEstimator } from '../estimators/royalty-estimation-model';
import { logger } from '../utils/logger';

chrome.runtime.onInstalled.addListener(async (details) => {
  logger.info('Background', `Extensão BookIntel instalada ou atualizada. Razão: ${details.reason}`);

  if (details.reason === 'install') {
    // Inicializa configurações padrão e modelos de vendas no IndexedDB
    try {
      await db.getSettings();
      await db.getSalesModels();
      logger.info('Background', 'Banco local inicializado com sucesso.');
    } catch (err: any) {
      logger.error('Background', `Erro ao inicializar banco: ${err.message}`, err);
    }
  }
});

// Listener de mensagens internas entre Content Scripts, Popup e Dashboard
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'OPEN_DASHBOARD') {
    const dashboardUrl = chrome.runtime.getURL('dashboard.html');
    let targetUrl = dashboardUrl;
    const queryParts: string[] = [];
    if (message.tab) queryParts.push(`tab=${encodeURIComponent(message.tab)}`);
    if (message.asin) queryParts.push(`asin=${encodeURIComponent(message.asin)}`);
    if (message.idea) queryParts.push(`idea=${encodeURIComponent(message.idea)}`);
    if (message.params) queryParts.push(message.params);

    if (queryParts.length > 0) {
      targetUrl = `${dashboardUrl}?${queryParts.join('&')}`;
    }

    chrome.tabs.query({ url: `${dashboardUrl}*` }, (tabs) => {
      if (tabs.length > 0 && tabs[0].id) {
        chrome.tabs.update(tabs[0].id, { active: true, url: targetUrl });
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
    });
    sendResponse({ status: 'ok' });
    return true;
  }

  if (message.type === 'RECALCULATE_ESTIMATES') {
    // Recalcula métricas derivadas em todas as observações com o novo modelo de vendas
    (async () => {
      try {
        const observations = await db.getAllObservations();
        const settings = await db.getSettings();
        defaultSalesEstimator.setMonthlyMultiplier(settings.monthlyDaysMultiplier);

        let count = 0;
        for (const obs of observations) {
          if (obs.bsr) {
            const activeModel = await db.getSalesModelFor(obs.marketplace);
            const est = defaultSalesEstimator.estimate({
              marketplace: obs.marketplace,
              bsr: obs.bsr,
              price: obs.price
            }, activeModel);

            obs.estimatedDailySales = est.estimatedDailySales || undefined;
            obs.estimatedMonthlySales = est.estimatedMonthlySales || undefined;
            obs.confidence = est.confidence;
            obs.modelVersion = est.methodVersion;

            if (obs.price && est.estimatedDailySales) {
              obs.estimatedDailyRevenue = Number((est.estimatedDailySales * obs.price).toFixed(2));
            }
            if (obs.price && est.estimatedMonthlySales) {
              obs.estimatedMonthlyRevenue = Number((est.estimatedMonthlySales * obs.price).toFixed(2));
            }

            const royalty = defaultRoyaltyEstimator.calculate(
              obs.price,
              'Kindle',
              undefined,
              obs.estimatedDailySales,
              obs.estimatedMonthlySales
            );
            obs.estimatedDailyRoyalty = royalty.estimatedDailyRoyalty || undefined;
            obs.estimatedMonthlyRoyalty = royalty.estimatedMonthlyRoyalty || undefined;

            await db.recordObservation(obs);
            count++;
          }
        }
        sendResponse({ status: 'ok', recalculated: count });
      } catch (err: any) {
        sendResponse({ status: 'error', message: err.message });
      }
    })();
    return true; // Resposta assíncrona
  }
});
