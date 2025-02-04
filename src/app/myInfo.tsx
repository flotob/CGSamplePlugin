'use client';
import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@/pluginLib';
import React, { useEffect, useState } from 'react';

const MyInfo = () => {
  const [userInfo, setUserInfo] = useState<UserInfoResponsePayload | null>(null);
  const [communityInfo, setCommunityInfo] = useState<CommunityInfoResponsePayload | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      console.log('fetching data');
      const cgPluginLibInstance = new CgPluginLib();

      cgPluginLibInstance.getUserInfo().then((userInfo) => {
        console.log('userInfo', userInfo);
        setUserInfo(userInfo);
      });

      cgPluginLibInstance.getCommunityInfo().then((communityInfo) => {
        console.log('communityInfo', communityInfo);
        setCommunityInfo(communityInfo);
      });
    };

    fetchData();
  }, []);


  return (<div className='flex flex-col gap-2'>
    <p className='font-bold'>Your username is: {userInfo?.name}</p>
    <p className='font-bold'>Your community is: {communityInfo?.name}</p>
  </div>);
}

export default MyInfo;