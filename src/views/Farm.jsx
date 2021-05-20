

/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useEffect } from "react";
// import "antd/dist/antd.css";
import { Button, Typography, Table, Input } from "antd";
import { ApolloClient, InMemoryCache, useQuery, gql } from '@apollo/client';
import GraphiQL from 'graphiql';
import 'graphiql/graphiql.min.css';
import fetch from 'isomorphic-fetch';
import { calculateRewardOtherAPR, calculateBaseAPR, calculateCrvAPR, convertToPrice, chartOptions, commarize, stDev, calculateRiskScore } from '../helpers';
import { defaults, Line } from 'react-chartjs-2';
import CurveImg from '../assets/curve.png';

const maticClient = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/dkirsche/pricehistorytest",
  cache: new InMemoryCache()
});

export default function Farm({ subgraph, crvPrices, maticPrices, timeframe }) {
  const [timeseries, setTimeseries] = useState([]);
  const [chartData, setChartData]   = useState({});
  const [totalAPR, setTotalAPR]     = useState(null);
  const [baseAPR, setBaseAPR]     = useState(null);
  const [rewardAPR, setRewardAPR]     = useState(null);
  const [tvl, setTvl]     = useState(null);
  const [histVol, setHistVol] = useState(null);
  const [riskScore, setRiskScore] = useState(null);
  console.log ({crvPrices})
  console.log ({maticPrices})
  const GET_PRICE_HISTORIES = gql`
  query Recent
  {
    priceHistoryDailies(first: 100, orderBy: timestamp, orderDirection: desc, where: {asset: "${subgraph.id}"}) {
      id
      pricePerShare
      timestamp
    }
  }`;

  const GET_REWARD_HISTORIES = gql`
  query Recent
  {
    rewardHistoryDailies(first: 100, orderBy: timestamp, orderDirection: desc, where: {asset: "${subgraph.id}"}) {
      asset {
        id
      }
      gaugeId
      rewardPerShareBoosted
      rewardPerShareNotBoosted
      workingSupply
      reward
      rewardToken
      rewardTokenID
      timestamp
    }
  }`;
  const GET_REWARD_OTHER = gql`
  query Recent
  {
    rewardOthers(first: 100, orderBy: timestamp, orderDirection: desc, where: {asset: "${subgraph.id}"}){
      asset {
          id
        }
      gaugeId
      rewardIntegral
      timestamp
    }
  }`;

  const { data: priceData,  error: errorPrice,  loading: loadingPrice }  = useQuery(GET_PRICE_HISTORIES);
  const { data: priceDataPolygon,  error: errorPricePolygon,  loading: loadingPricePolygon }  = useQuery(GET_PRICE_HISTORIES,{client: maticClient});

  const { data: rewardData, error: errorReward, loading: loadingReward } = useQuery(GET_REWARD_HISTORIES);
  const { data: rewardOtherData, error: errorRewardOther, loading: loadingRewardOther } = useQuery(GET_REWARD_OTHER,{client: maticClient});

  useEffect(()=>{
    const currentTime = new Date().getTime();
    const startOfDay  = currentTime - currentTime % (24 * 60 * 60);

    console.log("priceDataPolygon = ", priceDataPolygon)

    let startTimestamp;
    if (timeframe === '7d')
      startTimestamp = startOfDay - 8 * 24 * 60 * 60 * 1000;
    else if (timeframe == '30d')
      startTimestamp = startOfDay - 31 * 24 * 60 * 60 * 1000;
    else if (timeframe == '90d')
      startTimestamp = startOfDay - 91 * 24 * 60 * 60 * 1000;




    if (priceData && rewardData && rewardOtherData && priceData.priceHistoryDailies && rewardData.rewardHistoryDailies && rewardOtherData.rewardOthers && priceDataPolygon) {

      let latestPriceData;
      if (subgraph.network === 'ethereum') {
        let priceHistData   = Object.assign([], priceData.priceHistoryDailies);
        latestPriceData = priceHistData.reverse();
      } else {
        let priceHistData   = Object.assign([], priceDataPolygon.priceHistoryDailies);
        latestPriceData = priceHistData.reverse();
      }

      // Calculate TVL based on latest (DESC) data.
      if (latestPriceData && latestPriceData[0]) {
        const latestPricePerShare = latestPriceData[0].pricePerShare;
        const tvl = latestPricePerShare * subgraph.totalSupply / (Math.pow(10, 18) * Math.pow(10, 18));

        // Convert to Billys
        console.log("tvl = ", tvl)
        const prettyTVL = commarize(tvl)
        setTvl( "$" + prettyTVL )
      }

      const priceHistoryAll = mergeData(priceData.priceHistoryDailies,priceDataPolygon.priceHistoryDailies)
      const priceHistory  = priceHistoryAll.filter(price =>  price.timestamp * 1000 >= startTimestamp);

      const rewardHistory = rewardData.rewardHistoryDailies.filter(price => price.timestamp * 1000 >= startTimestamp);
      const rewardOther = rewardOtherData.rewardOthers.filter(price => price.timestamp * 1000 >= startTimestamp);

      let labels  = priceHistory.map( (h) => {
        const label = new Date(parseInt(h.timestamp * 1000))
        return label.toLocaleDateString("en-US");
      });

      let aprs = priceHistory.map( price => {
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


      // Get first element which is ordered by DESC GraphQL query.
      if(aprs[0]) {
        setBaseAPR(aprs[0].base.toFixed(1));
        setRewardAPR(aprs[0].reward.toFixed(1));
        setTotalAPR((aprs[0].base + aprs[0].reward).toFixed(1));
      }

      // Calculate total APR
      //sort ascending & remove first element which is just used so that pricePerShare_yesterday is available
      aprs = aprs.map(apr => apr.base + apr.reward);
      aprs = aprs.reverse();
      aprs.shift();


      // Define historical volatility & risk score
      console.log("stDev(aprs) = ", stDev(aprs))
      setHistVol(stDev(aprs).toFixed(1));
      setRiskScore(calculateRiskScore(aprs))


      // aprs = aprs.map(apr => { return apr.toString() + "%" })

      labels=labels.reverse()
      labels.shift()


      setChartData({
        labels: labels,
        datasets: [{
          label: 'Historical APR',
          backgroundColor: 'rgb(255, 99, 132)',
          borderColor: 'rgb(255, 99, 132)',
          data: aprs,
        }]
      });

    }

  }, [timeframe, priceData, rewardData,priceDataPolygon, rewardOtherData])


  function image() {
    const vaultName = subgraph.name.toLowerCase().split("_")[1];
    if (vaultName === 'yswap')
      return `https://curve.fi/static/icons/svg/crypto-icons-stack-ethereum.svg#yfi`
    else
      return `https://curve.fi/static/icons/svg/crypto-icons-stack-ethereum.svg#${vaultName}`
  }

  function prettyName() {
    const vaultName = subgraph.name.toLowerCase().split("_")[1];
    if (vaultName === 'compound')
      return 'Compound Pool'
    else if (vaultName === 'usdp')
      return 'USDP Pool'
    else if(vaultName === 'yswap')
      return 'Y Pool'
    else if(vaultName === 'ren')
      return 'BTC-REN Pool'
    else if(vaultName === 'susd')
      return 'sUSD Pool'
    else if(vaultName === 'aave')
      return 'AAVE Pool'
    else if(vaultName === '3pool')
      return '3Pool Pool'
    else
      return subgraph.name
  }

  return (
    <li className="list-group-item">
      <div className="row">
        <div className="col-2 align-items-center d-flex flex-column align-self-center">
          <div className="d-flex mb-2 justify-content-center">
            <div className="d-flex" style={{width: "100px"}}>
              <div className="farm-pair" style={{zIndex: 1}}>
                <img src={ CurveImg } />
              </div>

              <div className="farm-pair" style={{zIndex: 2}}>
                <img src={ image() } />
              </div>
            </div>
          </div>

          <h4 className="text-center">{ prettyName() }</h4>

          <span class="badge bg-warning text-dark">{ subgraph.network }</span>
        </div>

        <div className="col-1 align-items-center d-flex flex-column align-self-center">
          <h4 className="mb-1">{ tvl }</h4>
        </div>

        <div className="col-4">
          <div class="farm-chart">
            <Line data={chartData} options={chartOptions()} />
          </div>
        </div>

        <div className="col-2 align-items-center d-flex flex-column align-self-center">
          <h1 className="mb-1">{ totalAPR }%</h1>
          <p className="text-muted">{ baseAPR }% + { rewardAPR }%</p>
        </div>

        <div className="col-2 align-items-center d-flex flex-column align-self-center">
          <h1 className={`mb-1 fw-bold ${ riskScore == 'A' || riskScore == 'B' ? 'text-success' : (riskScore == 'C' || riskScore == 'D' ? 'text-warning' : 'text-danger')}`}>{ riskScore }</h1>
          <p className="text-muted">+/- { histVol}%</p>
        </div>
      </div>
    </li>
  );
}

function mergeData(mainnetData,polygonData){
  const mainnet = mainnetData.map(data => {
    return {...data, network: 'ethereum'}
  })
  const polygon = polygonData.map(data => {
    return {...data, network: 'polygon'}
  })

  return [...mainnet, ...polygon]
}
