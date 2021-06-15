import SubgraphList from "../config/subgraphs.json"
import { ApolloClient, InMemoryCache, useQuery, gql } from '@apollo/client';

  const SUBGRAPHS_QUERY = gql`
    query Recent
    {
      assets {
        id
        name
        totalSupply
        priceHistoryDaily(first: 100, orderBy: timestamp, orderDirection: desc) {
          id
          pricePerShare
          timestamp
        }
        rewardHistoryDaily(first: 100, orderBy: timestamp, orderDirection: desc) {
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

      }
    }`;

    const SUBGRAPHS_QUERY_MATIC = gql`
      query Recent
      {
        assets {
          id
          name
          totalSupply
          priceHistoryDaily(first: 100, orderBy: timestamp, orderDirection: desc) {
            id
            pricePerShare
            timestamp
          }
          rewardHistoryDaily(first: 100, orderBy: timestamp, orderDirection: desc) {
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
          rewardOther(first: 100, orderBy: timestamp, orderDirection: desc){
            asset {
                id
              }
            gaugeId
            rewardIntegral
            timestamp
          }
        }
      }`;
//return an array of clients
export function LoadClients(){
  let clients = new Map();
  //iterate through config file and load all clients
  for (let [key, value] of Object.entries(SubgraphList)) {
    const client = new ApolloClient({
      uri: value.uri,
      cache: new InMemoryCache()
    });
    clients.set(key,
      {
      "client" : client,
      "network" : value.network,
      "subgraphQuery" :""
    })
  }
  return clients
}


//load data from each of the subgraphs
export async function LoadAll(clients){
  let subgraph
  //subgraph = clients.get("XXX") XXX is the top level key for each subgraph in subgraph.json
  subgraph = clients.get("mainnet") //this is needed for each subgraph defined in subgraph.json.
  subgraph.subgraphQuery  = useQuery(SUBGRAPHS_QUERY,{client: subgraph.client});

  subgraph = clients.get("matic")
  subgraph.subgraphQuery  = useQuery(SUBGRAPHS_QUERY_MATIC,{client: subgraph.client});
}

//check if the data isLoaded
//used to know when to MergeData
export function IsLoaded(clients){
  clients.forEach((data,subgraphName) => {
    if (!data.subgraphQuery.data) return false
  })
  return true
}


//merge into one datasets
export function MergeData(clients){
  let allAssets = []
  clients.forEach((data,subgraphName) => {
    if (!data.subgraphQuery.data) return
    const assets = data.subgraphQuery.data.assets.map(asset => {
      return {...asset, network: data.network}
    })
    allAssets = [...allAssets, ...assets]
  })
  return allAssets
}
