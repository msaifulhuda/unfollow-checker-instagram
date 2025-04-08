interface InstagramUser {
    string_list_data: {
        value: string;
        timestamp: number;
    }[];
}

export function findUnfollowers(followersData: InstagramUser[], followingData: InstagramUser[]) {
    const followersSet = new Set(followersData.map(user => user.string_list_data[0].value));
    const followingList = followingData.map(user => user.string_list_data[0].value);

    const unfollowers = followingList.filter(user => !followersSet.has(user));

    return {
        unfollowers,
        totalFollowing: followingList.length,
    };
}
