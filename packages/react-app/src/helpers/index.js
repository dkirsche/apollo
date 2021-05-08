export { default as Transactor } from "./Transactor";

export function convertToPrice(numberInWei) {
  return numberInWei / Math.pow(10, 18);
}

export function calculateAPR({reward, pricePerShare, pricePerShare_yesterday, assetPrice}) {
  console.log({reward, pricePerShare, pricePerShare_yesterday, assetPrice})
  const baseAPR = ((pricePerShare - pricePerShare_yesterday) / pricePerShare_yesterday) * 365;
  const rewardAPR = reward/pricePerShare * assetPrice * 365
  const totalAPR = baseAPR + rewardAPR
  return totalAPR * 100;
}

export function chartOptions() {
  return {
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false
      },
    },

    scales: {

      // x: {
      //   min: 0,
      //   title: {
      //     // color: 'red',
      //     display: true,
      //     text: 'Date'
      //   },
      // },

      x: {
        // display: false,
        grid: {
          display: false,
          drawTicks: false,
        },

        ticks: {
          autoSkip: true,
          maxTicksLimit: 20
        }

        // ticks: {
        //   maxTicksLimit: 4
        // }

      },
      y: {
        grid: {
          display: false,
        },
      },

    }
  }
}
