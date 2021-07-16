// export function mergeData(mainnetData, polygonData) {
//   const mainnet = mainnetData.map(data => {
//     return {...data, network: 'ethereum'}
//   })
//   const polygon = polygonData.map(data => {
//     return {...data, network: 'polygon'}
//   })
//
//   return [...mainnet, ...polygon]
// }


export function timestampForTimeframe({timeframe}) {
  const currentTime = new Date().getTime();
  const startOfDay  = currentTime - currentTime % (24 * 60 * 60);

  if (timeframe === '7d')
    return startOfDay - 8 * 24 * 60 * 60 * 1000;
  else if (timeframe == '30d')
    return startOfDay - 31 * 24 * 60 * 60 * 1000;
  else if (timeframe == '90d')
    return startOfDay - 91 * 24 * 60 * 60 * 1000;
}

export function calculateAverageAPR({ aprs, timeframe }) {
  const index  = Number(timeframe.split("d")[0])
  const base   = aprs.slice(0, index).map(apr => apr.base).reduce((a,b) => a + b) / index;
  const reward = aprs.slice(0, index).map(apr => apr.reward).reduce((a,b) => a + b) / index;
  const total  = aprs.slice(0, index).map(apr => apr.base + apr.reward).reduce((a,b) => a + b) / index;

  return {
    base: base.toFixed(1),
    reward: reward.toFixed(1),
    total: total.toFixed(1)
  }
}

export function calculateAPR({ crvPrices, maticPrices, priceHistory, rewardHistory, rewardOther }) {
  return priceHistory.map( price => {
    // Iterate over price history finding the corresponding timestamp.
    const correspondingReward = rewardHistory.find(reward => {
      return price.timestamp === reward.timestamp
    });
    const correspondingRewardOther_yesterday = rewardOther.find(reward => {
      return (price.timestamp - (24*60*60)) == reward.timestamp
    });
    //Should be the closest to today's timestamp as possible. Creating the upperbound to the next day b/c there should be an upperbound, but ideally the timestamp is much closer to today's timestamp
    const correspondingRewardOther = rewardOther.find(reward => {
      return price.timestamp === reward.timestamp
    });
    const price_yesterday = priceHistory.find(this_price => {
      return (price.timestamp - (24*60*60)) == this_price.timestamp
    });
    const correspondingAssetPrice = crvPrices.find(this_price => {
      const assetTimestamp  = this_price[0];
      const priceHistoryTimestamp = price.timestamp * 1000; // start of day
      return assetTimestamp >= priceHistoryTimestamp && assetTimestamp <= priceHistoryTimestamp + 60 * 60 * 24 * 1000
    });
    const correspondingMaticPrice = maticPrices.find(this_price => {
      const assetTimestamp  = this_price[0];
      const priceHistoryTimestamp = price.timestamp * 1000; // start of day
      return assetTimestamp >= priceHistoryTimestamp && assetTimestamp <= priceHistoryTimestamp + 60 * 60 * 24 * 1000
    });

    let baseAPR = calculateBaseAPR({
      pricePerShare: price?.pricePerShare,
      pricePerShare_yesterday: price_yesterday?.pricePerShare,
    })
    let crvRewardAPR = calculateCrvAPR({
      reward: correspondingReward?.rewardPerShareNotBoosted || 0,
      pricePerShare: price?.pricePerShare,
      assetPrice: correspondingAssetPrice ? correspondingAssetPrice[1] : 0,
    })
    let otherRewardAPR = calculateRewardOtherAPR({
      rewardIntegral: correspondingRewardOther?.rewardIntegral,
      rewardIntegral_yesterday: correspondingRewardOther_yesterday?.rewardIntegral,
      rewardIntegralTimeStamp: correspondingRewardOther?.timestamp,
      rewardIntegralTimeStamp_yesterday: correspondingRewardOther_yesterday?.timestamp,
      rewardPrice: correspondingMaticPrice ? correspondingMaticPrice[1] : 0,
    })
    return {base: baseAPR, reward: otherRewardAPR + crvRewardAPR}
  });
}

export function getProtocol({ subgraph }) {
  const subgraphName = subgraph.name.toLowerCase();

  if (subgraphName.indexOf("aave") > -1 && subgraphName.indexOf("curve") === -1) {
    return "aave";
  }

  if (subgraphName.indexOf("yvault") > -1) {
    return "yearn";
  }

  return "curve";
}

export function getLogo({ subgraph }) {

  const vaultName = subgraph.name.toLowerCase().split("_")[1];
  if (vaultName === 'yswap')
    return `https://curve.fi/static/icons/svg/crypto-icons-stack-ethereum.svg#yfi`
  else
    return `https://curve.fi/static/icons/svg/crypto-icons-stack-ethereum.svg#${vaultName}`

}

export function vaultName({ subgraph }) {
  const subgraphName = subgraph.name.toLowerCase();

  if (getProtocol({subgraph}) === 'aave') {
    return subgraph.name.split("Aave")[1]
  }

  if (getProtocol({subgraph}) === 'yearn') {
    const splits = subgraph.name.split(" ");

    if (splits.length === 2)
      return splits[0]
    else if (splits[0].toLowerCase() === 'curve')
      return "crv" + splits[1];
  }

  const vaultName = subgraphName.split("_")[1];

  if (vaultName === 'compound')
    return 'COMP'
  else if (vaultName === 'usdp')
    return 'USDP'
  else if(vaultName === 'yswap')
    return 'Y Pool'
  else if(vaultName === 'ren')
    return 'REN'
  else if(vaultName === 'susd')
    return 'sUSD'
  else if(vaultName === 'aave')
    return 'AAVE'
  else if(vaultName === '3pool')
    return '3Pool'
  else
    return subgraph.name
}


// Calculate TVL based on latest (DESC) data.
export function calculateTVL({ priceHistory, totalSupply }) {
  if (!priceHistory || !priceHistory[0])
    return null

  const latestPricePerShare = priceHistory[0].pricePerShare;
  const tvl = latestPricePerShare * totalSupply / (Math.pow(10, 18) * Math.pow(10, 18));

  return tvl;
}

export function convertToPrice(numberInWei) {
  return numberInWei / Math.pow(10, 18);
}

export function calculateBaseAPR({pricePerShare, pricePerShare_yesterday}) {
  if (!pricePerShare || !pricePerShare_yesterday) return 0
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
        radius: 2,
        hitRadius:3
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
