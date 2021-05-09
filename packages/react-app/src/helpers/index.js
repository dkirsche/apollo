export { default as Transactor } from "./Transactor";

export function convertToPrice(numberInWei) {
  return numberInWei / Math.pow(10, 18);
}

export function calculateAPR({reward, pricePerShare, pricePerShare_yesterday, assetPrice}) {
  const baseAPR = ((pricePerShare - pricePerShare_yesterday) / pricePerShare_yesterday) * 365;
  const rewardAPR = reward/pricePerShare * assetPrice * 365
  const totalAPR = baseAPR + rewardAPR
  //console.log({reward, pricePerShare, pricePerShare_yesterday, assetPrice, baseAPR, rewardAPR, totalAPR})
  return totalAPR * 100;
}

export function calculateRewardOtherAPR({rewardIntegral, rewardIntegral_yesterday, rewardIntegralTimeStamp, rewardIntegralTimeStamp_yesterday, rewardPrice}) {
  if (!rewardIntegral || !rewardIntegral_yesterday || !rewardIntegralTimeStamp || !rewardIntegralTimeStamp_yesterday || !rewardPrice){
    console.log ("returning 0")
    return 0;
  }
  const rewardDiff = (rewardIntegral - rewardIntegral_yesterday) / Math.pow(10, 18)
  const elapsedTime = rewardIntegralTimeStamp - rewardIntegralTimeStamp_yesterday
  const secondsPerYear = 31536000
  const rewardOtherAPR = (secondsPerYear/elapsedTime) * rewardDiff * rewardPrice
  //console.log({rewardIntegral, rewardIntegral_yesterday, rewardIntegralTimeStamp, rewardIntegralTimeStamp_yesterday, rewardPrice, rewardOtherAPR})
  return rewardOtherAPR * 100;
}

export function chartOptions() {
  return {
    maintainAspectRatio: false,

    plugins: {
      legend: {
        display: false
      },
    },

    elements: {
      point:{
        radius: 0
      }
    },

    scales: {
      x: {
        // display: false,
        grid: {
          display: false,
          drawTicks: false,
        },

        ticks: {
          autoSkip: true,
          maxTicksLimit: 8
        }

      },
      y: {
        grid: {
          display: false,
        },
      },

    }
  }
}
