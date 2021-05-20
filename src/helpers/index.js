
export function convertToPrice(numberInWei) {
  return numberInWei / Math.pow(10, 18);
}

export function calculateBaseAPR({pricePerShare, pricePerShare_yesterday}) {
  const baseAPR = ((pricePerShare - pricePerShare_yesterday) / pricePerShare_yesterday) * 365;
  //const rewardAPR = reward/pricePerShare * assetPrice * 365
  //const totalAPR = baseAPR + rewardAPR
  //console.log({reward, pricePerShare, pricePerShare_yesterday, assetPrice, baseAPR, rewardAPR, totalAPR})
  return baseAPR * 100;
}

export function calculateCrvAPR({reward, pricePerShare, assetPrice}) {
  const rewardAPR = reward/pricePerShare * assetPrice * 365
  //console.log({reward, pricePerShare, pricePerShare_yesterday, assetPrice, baseAPR, rewardAPR, totalAPR})
  return rewardAPR * 100;
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
        suggestedMin:0,
        grid: {
          display: false,
        },
      },

    }
  }
}

// I define risk score as
// F: Volatility to mean ratio is 75%+
// D: Volatility to mean ratio is 50%-75%
// C: ...25-50%%
// B 10%-25%
// A: 10% or less
export function calculateRiskScore(array) {
  const varCoeff = stDev(array) / mean(array);
  if (varCoeff < 0.1)
    return "A"
  else if (varCoeff < 0.25)
    return 'B'
  else if (varCoeff < 0.5)
    return 'C'
  else if (varCoeff < 0.75)
    return 'D'
  else
    return 'F'
}

export function commarize(value) {
  // Alter numbers larger than 1k
  if (value >= 1e3) {
    var units = ["k", "M", "B", "T"];

    // Divide to get SI Unit engineering style numbers (1e3,1e6,1e9, etc)
    let unit = Math.floor((value.toFixed(0).length - 1) / 3) * 3
    // Calculate the remainder
    var num = (value / ('1e'+unit)).toFixed(2)
    var unitname = units[Math.floor(unit / 3) - 1]

    // output number remainder + unitname
    return num + unitname
  }

  // return formatted original number
  return value.toLocaleString()
}

export function mean(array) {
  return array.reduce((a, b) => a + b) / array.length;
}

export function stDev(array) {
  return Math.sqrt(array.map(x => Math.pow(x - mean(array), 2)).reduce((a, b) => a + b) / array.length)
}
