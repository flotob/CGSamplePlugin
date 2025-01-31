'use client';
import { CgPluginLib, CommunityInfoResponse, UserInfoResponse } from '@/pluginLib';
import React, { useEffect, useState } from 'react';

const MyInfo = () => {
  const [userInfo, setUserInfo] = useState<UserInfoResponse['data'] | null>(null);
  const [communityInfo, setCommunityInfo] = useState<CommunityInfoResponse['data'] | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const cgPluginLibInstance = new CgPluginLib();

      const userInfo = await cgPluginLibInstance.getUserInfo();
      const communityInfo = await cgPluginLibInstance.getCommunityInfo();

      setUserInfo(userInfo);
      setCommunityInfo(communityInfo);
    };

    fetchData();
  }, []);


  return (<div className='flex flex-col gap-2'>
    <p className='font-bold'>Your username is: {userInfo?.name}</p>
    <p className='font-bold'>Your community is: {communityInfo?.name}</p>
  </div>);
}

export default MyInfo;