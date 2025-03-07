'use client';
import { CgPluginLib, CommunityInfoResponsePayload, UserInfoResponsePayload } from '@common-ground-dao/cg-plugin-lib';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';

const publicKey = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA2flPngWzLjtXO5gsL8cF
FWX1OnN4Oc3xJ6uNLt47U3vSLZISu5zfXEzOS3kj2VqkqmWan05cG+UngNaOrpzC
BKZSaNZZR1MYg1DYIFGBxG5e/SnkW/sXj+Fq3ytrXJHVlKBZ7K3O17vi2a8nsJyW
u7Ks+bqELYczdqBRYbneKwbjhnAjYwUleY4gHb5U/fjCl0bBSUXyOJbsdZM+KjRs
wwfr2eU9gL2cT4xXc7okZqDPrzfJI/aHbWBTZN76MWM7j4CCiV+8Kg/Xa8nNcwWj
xsbYLKHnJebkfQCSjWJNrHvuaNIVTcxqjmao89mFe6TtlMU0/iloGPMW9shjjPHo
pQIDAQAB
-----END PUBLIC KEY-----`;

const MyInfo = () => {
  const [userInfo, setUserInfo] = useState<UserInfoResponsePayload | null>(null);
  const [communityInfo, setCommunityInfo] = useState<CommunityInfoResponsePayload | null>(null);
  const searchParams = useSearchParams();
  const iframeUid = searchParams.get('iframeUid');

  useEffect(() => {
    const fetchData = async () => {
      const cgPluginLibInstance = await CgPluginLib.initialize(iframeUid || '', '/api/sign', publicKey);
      cgPluginLibInstance.getUserInfo().then((userInfo) => {
        console.log('userInfo', userInfo);
        setUserInfo(userInfo.data);
      });

      cgPluginLibInstance.getCommunityInfo().then((communityInfo) => {
        console.log('communityInfo', communityInfo);
        setCommunityInfo(communityInfo.data);
      });

      // const response = await cgPluginLibInstance.giveRole('admin', 'asdf');
      // console.log('response', response);
    }

    fetchData();
  }, [iframeUid]);

  const assignableRoles = useMemo(() => {
    return communityInfo?.roles.filter((role) => role.assignmentRules?.type === 'free' || role.assignmentRules === null);
  }, [communityInfo]);

  return (<div className='flex flex-col gap-2'>
    <p className='font-bold'>Your username is: {userInfo?.name}</p>
    <p className='font-bold'>Your community is: {communityInfo?.title}</p>

    {assignableRoles && assignableRoles.length > 0 && <div className='flex flex-col gap-2 p-2 border border-gray-300 rounded-md'>
      <p className='font-bold'>Assignable roles</p>
      {assignableRoles?.map((role) => (
        <div className='grid grid-cols-2 items-center gap-2' key={role.id}>
          <p>{role.title}</p>
          {userInfo?.roles.includes(role.id) ? <span>Has Role</span> : <button className='bg-blue-500 text-white px-2 py-1 rounded-md' onClick={() => CgPluginLib.getInstance().giveRole(role.id, userInfo?.id || '')}>Give role</button>}
        </div>
      ))}
    </div>}
  </div>);
}

export default MyInfo;