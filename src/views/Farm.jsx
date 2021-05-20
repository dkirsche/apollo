

/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useEffect } from "react";
import { ApolloClient, InMemoryCache, useQuery, gql } from '@apollo/client';
import GraphiQL from 'graphiql';
import 'graphiql/graphiql.min.css';
import fetch from 'isomorphic-fetch';
import { calculateRewardOtherAPR, calculateBaseAPR, calculateCrvAPR, convertToPrice, chartOptions, commarize, stDev, calculateRiskScore, calculateTVL, calculateAPR, timestampForTimeframe } from '../helpers';
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
  // console.log ({crvPrices})
  // console.log ({maticPrices})
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

    if (!loadingPrice && !loadingPricePolygon && !loadingReward && !loadingRewardOther) {
      const startTimestamp = timestampForTimeframe({timeframe})

      const priceHistoryAll = mergeData(priceData.priceHistoryDailies,priceDataPolygon.priceHistoryDailies)
      const priceHistory  = priceHistoryAll.filter(price =>  price.timestamp * 1000 >= startTimestamp);

      const rewardHistory = rewardData.rewardHistoryDailies.filter(price => price.timestamp * 1000 >= startTimestamp);
      const rewardOther = rewardOtherData.rewardOthers.filter(price => price.timestamp * 1000 >= startTimestamp);

      let aprs = calculateAPR({ crvPrices, maticPrices, priceHistory, rewardHistory, rewardOther })

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
      setHistVol(stDev(aprs).toFixed(1));
      setRiskScore(calculateRiskScore(aprs))

      let labels  = priceHistory.map( (h) => {
        const label = new Date(parseInt(h.timestamp * 1000))
        return label.toLocaleDateString("en-US");
      });

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

    if (!loadingPrice && !loadingPricePolygon) {
      let latestPriceData;
      if (subgraph.network === 'ethereum') {
        let priceHistData   = Object.assign([], priceData.priceHistoryDailies);
        latestPriceData = priceHistData.reverse();
      } else {
        let priceHistData   = Object.assign([], priceDataPolygon.priceHistoryDailies);
        latestPriceData = priceHistData.reverse();
      }

      const prettyTVL = calculateTVL({ priceHistory: latestPriceData, totalSupply: subgraph.totalSupply })
      setTvl( "$" + prettyTVL )
    }

  }, [timeframe, priceData, rewardData, priceDataPolygon, rewardOtherData])


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
            {loadingPrice && <div className="col-12 text-center">
              <i className="fa fa-sync fa-spin" style={{fontSize: "32px"}} />
            </div>}

            {!loadingPrice && <Line data={chartData} options={chartOptions()} />}
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
