

/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useEffect } from "react";
// import "antd/dist/antd.css";
import { Button, Typography, Table, Input } from "antd";
import { useQuery, gql } from '@apollo/client';
import { Address } from "../components";
import GraphiQL from 'graphiql';
import 'graphiql/graphiql.min.css';
import fetch from 'isomorphic-fetch';
import { calculateAPR, convertToPrice, chartOptions } from '../helpers';
import { defaults, Line } from 'react-chartjs-2';
import CurveImg from '../assets/curve.png';

export default function Farm({ subgraph, crvPrices, timeframe }) {
  const [timeseries, setTimeseries] = useState([]);
  const [chartData, setChartData]   = useState({});
  const [lastAPR, setLastAPR]     = useState(null);

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

  const { data: priceData,  error: errorPrice,  loading: loadingPrice }  = useQuery(GET_PRICE_HISTORIES);
  const { data: rewardData, error: errorReward, loading: loadingReward } = useQuery(GET_REWARD_HISTORIES);

  useEffect(()=>{
    const currentTime = new Date().getTime();
    const startOfDay  = currentTime - currentTime % (24 * 60 * 60);

    if (priceData && rewardData && priceData.priceHistoryDailies && rewardData.rewardHistoryDailies) {

      let startTimestamp;
      if (timeframe === '7d')
        startTimestamp = startOfDay - 8 * 24 * 60 * 60 * 1000;
      else if (timeframe == '30d')
        startTimestamp = startOfDay - 31 * 24 * 60 * 60 * 1000;
      else if (timeframe == '90d')
        startTimestamp = startOfDay - 91 * 24 * 60 * 60 * 1000;

      // console.log("startTimestamp  ", startTimestamp)
      const priceHistory  = priceData.priceHistoryDailies.filter(price =>  price.timestamp * 1000 >= startTimestamp);
      const rewardHistory = rewardData.rewardHistoryDailies.filter(price => price.timestamp * 1000 >= startTimestamp);

      let labels  = rewardHistory.map( (h) => {
        const label =new Date(parseInt(h.timestamp * 1000))
        return label.toLocaleDateString("en-US");
      });

      let aprs = rewardHistory.map( reward => {
        // Iterate over price history finding the corresponding timestamp.
        const correspondingPrice = priceHistory.find(price => {
          return reward.timestamp === price.timestamp
        });
        const yesterdayPrice = priceHistory.find(price => {
          return (reward.timestamp - (24*60*60)) == price.timestamp
        });
        const correspondingAssetPrice = crvPrices.find(price => {
          const assetTimestamp  = price[0];
          const rewardTimestamp = reward.timestamp * 1000; // start of day
          return assetTimestamp >= rewardTimestamp && assetTimestamp <= rewardTimestamp + 60 * 60 * 24 * 1000
        });

        if (correspondingPrice && correspondingAssetPrice) {
          return calculateAPR({
            reward: reward.rewardPerShareNotBoosted,
            pricePerShare: correspondingPrice?.pricePerShare,
            pricePerShare_yesterday: yesterdayPrice?.pricePerShare,
            assetPrice: correspondingAssetPrice[1],
          })
        } else {
          return 0
        }
      });
      //sort ascending & remove first element which is just used so that pricePerShare_yesterday is available
      aprs = aprs.reverse();
      aprs.shift();

      console.log("Aprs = ", aprs)
      if(aprs[0]) {
        setLastAPR(aprs[0].toFixed(2));
      }


      // aprs = aprs.map(apr => { return apr.toString() + "%" })
      console.log("aprs = ", aprs)
      labels=labels.reverse()
      labels.shift()
      console.log({labels, aprs});

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

  }, [priceData, rewardData, timeframe])


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
        <div className="col-3 align-items-center d-flex flex-column align-self-center">
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

        </div>

        <div className="col-4">
          <div class="farm-chart">
            <Line data={chartData} options={chartOptions()} />
          </div>
        </div>

        <div className="col-5 align-items-center d-flex flex-column align-self-center">
          <h1 className="mb-1">{ lastAPR }%</h1>
          <p className="text-muted">Latest APR</p>
        </div>
      </div>
    </li>
  );
}
