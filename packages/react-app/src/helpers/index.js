export { default as Transactor } from "./Transactor";

export function convertToPrice(numberInWei) {
  return numberInWei / Math.pow(10, 18);
}

export function calculateAPR({reward, pricePerShare, assetPrice}) {
  const virtualPriceRatio = (reward / pricePerShare);
  return virtualPriceRatio * assetPrice;
}

export function chartOptions() {
  return {
    scales: {
      x: {
        min: 0,
        title: {
          // color: 'red',
          display: true,
          text: 'Time'
        },

      }
    }
  }
}
