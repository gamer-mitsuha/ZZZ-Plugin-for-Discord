import MysZZZApi from './mysapi.js';
import { getCk } from './common.js';
import _ from 'lodash';
import NoteUser from '../../genshin/model/mys/NoteUser.js';
import settings from '../lib/settings.js';
import request from '../utils/request.js';

export class ZZZPlugin extends plugin {
  /**
   * 获取用户 UID（如果需要同时获取API，可以直接调用 getAPI）
   * @returns {Promise<string | boolean>}
   */
  async getUID() {
    // 默认为当前用户
    let user = this.e;
    // 获取配置
    const query = settings.getConfig('config').query;
    const allow = _.get(query, 'others', true);
    // 如果 at 存在且允许查看其他用户
    if (this.e.at && allow) {
      // 将当前用户的 user_id 设置为 at 对象的 user_id
      this.e.user_id = this.e.at;
      // 将当前用户设置为 at 对象
      user = this.e.at;
    }
    // 获取用户信息（米游社），因此这里会导致查询一次米游社的信息
    this.User = await NoteUser.create(user);
    // 获取用户 UID
    const uid = this.User?.getUid('zzz');
    // 如果 UID 不存在，说明没有绑定 cookie
    if (!uid) {
      await this.reply(
        'uid为空，需要CK的功能请先绑定CK或者#扫码登录，需要SK的功能请#扫码登录，若不清楚需要CK或SK，请查看%帮助'
      );
      return false;
    }
    // 返回 UID
    return uid;
  }

  /**
   * 获取用户 ltuid
   * @returns {Promise<string | boolean>}
   * @memberof ZZZPlugin
   * @description 获取用户 ltuid
   * @example
   * const ltuid = await this.getLtuid();
   * if (!ltuid) return false;
   * @returns {Promise<string | boolean>}
   */
  async getLtuid() {
    const uid = await this.getUID();
    if (!uid) return false;
    const ck = await getCk(this.e);
    if (!ck || Object.keys(ck).filter(k => ck[k].ck).length === 0) {
      await this.reply('尚未绑定cookie，请先绑定cookie，或者#扫码登录');
      return false;
    }
    const currentCK = Object.values(ck).find(item => {
      return item.ck && item.uid === uid;
    });
    return currentCK?.ltuid || '';
  }
  /**
   * 获取米游社 API
   * @returns {Promise<{api: MysZZZApi, uid: string, deviceFp: string}>}
   */
  async getAPI() {
    // 直接调用获取 UID
    const uid = await this.getUID();
    if (!uid) return { api: null, uid: null, deviceFp: null };
    // 获取用户的 cookie
    const ck = await getCk(this.e);
    // 如果 cookie 不存在或者 cookie 为空，说明没有绑定 cookie
    if (!ck || Object.keys(ck).filter(k => ck[k].ck).length === 0) {
      await this.reply('尚未绑定cookie，请先绑定cookie，或者#扫码登录');
      return { api: null, uid: null, deviceFp: null };
    }
    try {
      // 创建米游社 API 对象
      const api = new MysZZZApi(uid, ck);
      const currentCK = Object.values(ck).find(item => {
        return item.ck && item.uid === uid;
      });
      const ltuid = currentCK?.ltuid || '';
      if (!ltuid) {
        return { api: null, uid: null, deviceFp: null };
      }
      // 获取设备指纹
      let deviceFp
      let bindInfo = await redis.get(`ZZZ:DEVICE_FP:${ltuid}:BIND`);
      if (bindInfo) {
        deviceFp = await redis.get(`ZZZ:DEVICE_FP:${ltuid}:FP`);
        let data = {
          deviceFp,
        };
        try {
          bindInfo = JSON.parse(bindInfo);
          data = {
            productName: bindInfo?.deviceProduct,
            deviceType: bindInfo?.deviceName,
            modelName: bindInfo?.deviceModel,
            oaid: bindInfo?.oaid,
            deviceInfo: bindInfo?.deviceFingerprint,
            board: bindInfo?.deviceBoard,
          };
        } catch (error) {
          bindInfo = null;
        }
        if (!deviceFp) {
          const sdk = api.getUrl('getFp', data);
          const res = await request(sdk.url, {
            headers: sdk.headers,
            method: 'POST',
            body: sdk.body,
          });
          const fpRes = await res.json();
          logger.debug(`[米游社][设备指纹]${JSON.stringify(fpRes)}`);
          deviceFp = fpRes?.data?.device_fp;
          if (!deviceFp) {
            return { api: null, uid: null, deviceFp: null };
          }
          await redis.set(`ZZZ:DEVICE_FP:${ltuid}:FP`, deviceFp, {
            EX: 86400 * 7,
          });
          data['deviceFp'] = deviceFp;
          const deviceLogin = api.getUrl('deviceLogin', data);
          const saveDevice = api.getUrl('saveDevice', data);
          if (!!deviceLogin && !!saveDevice) {
            logger.debug(`[米游社][设备登录]保存设备信息`);
            try {
              logger.debug(`[米游社][设备登录]${JSON.stringify(deviceLogin)}`);
              const login = await request(deviceLogin.url, {
                headers: deviceLogin.headers,
                method: 'POST',
                body: deviceLogin.body,
              });
              const save = await request(saveDevice.url, {
                headers: saveDevice.headers,
                method: 'POST',
                body: saveDevice.body,
              });
              const result = await Promise.all([login.json(), save.json()]);
              logger.debug(`[米游社][设备登录]${JSON.stringify(result)}`);
            } catch (error) {
              logger.error(`[米游社][设备登录]${error.message}`);
            }
          }
        }
      } else {
        deviceFp = await redis.get(`ZZZ:DEVICE_FP:${uid}`);
        if (!deviceFp) {
          const sdk = api.getUrl('getFp');
          const res = await fetch(sdk.url, {
            headers: sdk.headers,
            method: 'POST',
            body: sdk.body,
          });
          const fpRes = await res.json();
          deviceFp = fpRes?.data?.device_fp;
          if (deviceFp) {
            await redis.set(`ZZZ:DEVICE_FP:${uid}`, deviceFp, {
              EX: 86400 * 7,
            });
          }
        }
      }
      // 返回数据（API、UID、设备指纹）
      return { api, uid, deviceFp };
    } catch (error) {
      this.reply(error.message);
      return { api: null, uid: null, deviceFp: null };
    }
  }

  /**
   * 获取玩家信息（当调用此方法时，会获取用户的玩家信息，并将其保存到`e.playerCard`中，方便渲染用户信息（此部分请查阅`lib/render.js`中两个模块的作用））
   * @returns {Promise<boolean | object>}
   */
  async getPlayerInfo() {
    // 获取 米游社 API
    const { api, uid } = await this.getAPI();
    if (!api) return false;
    // 获取用户信息
    let userData = await api.getFinalData(this.e, 'zzzUser');
    if (!userData) return false;
    // 取第一个用户信息
    userData =
      userData?.list?.find(item => item.game_uid == uid) || userData?.list?.[0];

    // 获取用户头像
    let avatar = this.e.user_avatar || '';

    // 写入数据
    this.e.playerCard = {
      avatar: avatar,
      player: userData,
    };
    // 返回数据
    return userData;
  }
}
