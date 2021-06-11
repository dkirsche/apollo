

/* eslint-disable jsx-a11y/accessible-emoji */
import React, { useState, useEffect } from "react";
import { ApolloClient, InMemoryCache, useQuery, gql } from '@apollo/client';
import GraphiQL from 'graphiql';
import 'graphiql/graphiql.min.css';
import fetch from 'isomorphic-fetch';
import { calculateRewardOtherAPR,
  calculateBaseAPR, calculateCrvAPR, convertToPrice, chartOptions, commarize, stDev, calculateRiskScore,
  calculateTVL, calculateAPR, timestampForTimeframe, calculateAverageAPR  } from '../helpers';
import { defaults, Line } from 'react-chartjs-2';
import CurveImg from '../assets/curve.png';

const maticClient = new ApolloClient({
  uri: "https://api.thegraph.com/subgraphs/name/dkirsche/pricehistorytest",
  cache: new InMemoryCache()
});

export default function Farm({ subgraph, crvPrices, maticPrices, timeframe, priceHistoryAll, rewardHistoryAll }) {
  const [timeseries, setTimeseries] = useState([]);
  const [chartData, setChartData]   = useState({});
  const [totalAPR, setTotalAPR]     = useState(null);
  const [baseAPR, setBaseAPR]     = useState(null);
  const [rewardAPR, setRewardAPR]     = useState(null);
  const [tvl, setTvl]     = useState(null);
  const [histVol, setHistVol] = useState(null);
  const [riskScore, setRiskScore] = useState(null);

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

  const { data: rewardOtherData, error: errorRewardOther, loading: loadingRewardOther } = useQuery(GET_REWARD_OTHER,{client: maticClient});

  useEffect(()=>{
    if (!loadingRewardOther) {
      const startTimestamp = timestampForTimeframe({timeframe})

      const priceHistory  = priceHistoryAll.filter(price =>  price.timestamp * 1000 >= startTimestamp);
      const rewardHistory = rewardHistoryAll.filter(price => price.timestamp * 1000 >= startTimestamp);
      const rewardOther = rewardOtherData.rewardOthers.filter(price => price.timestamp * 1000 >= startTimestamp);

      let aprs = calculateAPR({ crvPrices, maticPrices, priceHistory, rewardHistory, rewardOther })

      //sort ascending & remove first element which is just used so that pricePerShare_yesterday is available
      aprs = aprs.reverse();
      aprs.shift();

      if(aprs[0]) {
        const averageAPRs = calculateAverageAPR({aprs, timeframe});
        setBaseAPR(averageAPRs.base);
        setRewardAPR(averageAPRs.reward);
        setTotalAPR(averageAPRs.total);
      }

      // Calculate total APR
      aprs = aprs.map(apr => apr.base + apr.reward);

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

  }, [timeframe,  rewardOtherData])


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
    <React.Fragment>
      <tr key={subgraph.name}>
        <td class="text-center" style={{width: "15%"}}>
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
          <span className="badge bg-warning text-dark">{ subgraph.network }</span>
        </td>

        <td style={{width: "15%"}} class="text-center">
          <h4 className="mb-1">${ commarize(subgraph.tvl) }</h4>
        </td>

        <td style={{width: "30%"}} className='text-center'>
          <div className="farm-chart">
            <Line data={chartData} options={chartOptions()} />
          </div>
        </td>



        <td style={{width: "15%"}} className='text-center'>
          <h1 className="mb-1">{ totalAPR }%</h1>
          <p className="text-muted">{ baseAPR }% + { rewardAPR }%</p>
        </td>

        <td style={{width: "15%"}} className='text-center'>
          <h1 className={`mb-1 fw-bold ${ riskScore == 'A' || riskScore == 'B' ? 'text-success' : (riskScore == 'C' || riskScore == 'D' ? 'text-warning' : 'text-danger')}`}>{ riskScore }</h1>
          <p className="text-muted">+/- { histVol}%</p>
        </td>

      </tr>

    </React.Fragment>
  );
}
