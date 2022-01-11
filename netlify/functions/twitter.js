const fetch = require('node-fetch')

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.TWITTER_TOKEN}`,
  }
}

async function delay(time) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), time)
  })
}

async function getFriendsOfUser(username, cursor = -1, count = 200) {
  const url = new URL('https://api.twitter.com/1.1/friends/list.json')
  url.searchParams.set('screen_name', username)
  url.searchParams.set('cursor', cursor)
  url.searchParams.set('count', count)
  const response = await fetch(url.toString(), {
    headers: getHeaders(),
  })
  return response.json()
}

async function getAllFriendsOfUser(username) {
  let cursor = -1
  let allUsers = []
  while (cursor !== 0) {
    const { users, next_cursor } = await getFriendsOfUser(username, cursor)
    allUsers = [...allUsers, ...users]
    cursor = next_cursor
  }
  return allUsers
}

async function getRecentTweetsFromUser(username, granularity = 'day') {
  const url = new URL('https://api.twitter.com/2/tweets/counts/recent')
  url.searchParams.set('granularity', granularity)
  url.searchParams.set('query', `from:${username}`)
  const response = await fetch(url, {
    headers: getHeaders(),
  })
  return response.json()
}

exports.handler = async function handler(event, context) {
  const allFriends = await getAllFriendsOfUser('sledsworth')

  const tweetActivityOfFriendsPromises = allFriends.map(
    async (friend, index) => {
      await delay(index * 1000)
      return getRecentTweetsFromUser(friend.screen_name)
    }
  )

  const tweetActivityOfFriends = await Promise.all(
    tweetActivityOfFriendsPromises
  )
  const combined = allFriends
    .map((friend, index) => {
      const tweetCountInfo = tweetActivityOfFriends[index]
      let recentTweetCount = 0
      if (tweetCountInfo && tweetCountInfo.meta) {
        recentTweetCount = tweetCountInfo.meta.total_tweet_count
      }
      console.log(recentTweetCount)
      return {
        name: friend.name,
        screenName: friend.screen_name,
        url: friend.url,
        description: friend.description,
        recentTweetCount,
      }
    })
    .sort(
      (friendA, friendB) => friendB.recentTweetCount - friendA.recentTweetCount
    )

  return {
    statusCode: 200,
    body: JSON.stringify(combined),
  }
}
