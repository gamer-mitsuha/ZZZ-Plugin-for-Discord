import { ZZZPlugin } from '../lib/plugin.js';
import { rulePrefix } from '../lib/common.js';
import render from '../lib/render.js';
import settings from '../lib/settings.js';
import _ from 'lodash';
/**
 * @typedef {Object} HelpItem
 * @property {string} title
 * @property {string} desc
 * @property {boolean} needCK
 * @property {boolean} needSK
 * @property {string[]} commands
 */
/**
 * @typedef {Object} HelpData
 * @property {string} title
 * @property {'fire'|'ice'|'physdmg'|'thunder'|'dungeon'} icon
 * @property {HelpItem[]} items
 */

/**
 * @type {HelpData[]}
 * @description 帮助数据
 */
const helpData = [
  {
    title: '信息查询',
    icon: 'fire',
    items: [
      {
        title: '基本信息',
        desc: '查看玩家的角色和邦布列表',
        needCK: true,
        needSK: false,
        commands: ['card', '卡片', '个人信息'],
      },
      {
        title: '便签',
        desc: '查看体力、刮刮卡、营业、每日任务完成情况等信息',
        needCK: true,
        needSK: false,
        commands: ['note', '便签', '便笺', '体力', '每日'],
      },
    ],
  },
  {
    title: '抽卡记录',
    icon: 'ice',
    items: [
      {
        title: '刷新抽卡记录',
        desc: '刷新抽卡记录，如果数据过多，可能需要等待很长一段时间，请等待回复后再%查看抽卡记录',
        needCK: true,
        needSK: true,
        commands: ['刷新/更新抽卡链接', '刷新/更新抽卡记录'],
      },
      {
        title: '获取抽卡记录链接',
        desc: '获取抽卡记录链接，获取链接后可以用于小程序等第三方工具查看抽卡记录',
        needCK: true,
        needSK: true,
        commands: ['获取抽卡链接'],
      },
      {
        title: '查看抽卡记录',
        desc: '查看抽卡记录，需要手动%刷新抽卡记录，否则读取的是缓存数据',
        needCK: false,
        needSK: false,
        commands: ['抽卡分析', '抽卡记录'],
      },
    ],
  },
  {
    title: '角色面板',
    icon: 'thunder',
    items: [
      {
        title: '刷新角色面板',
        desc: '刷新角色面板',
        needCK: true,
        needSK: false,
        commands: ['刷新面板', '更新面板', '面板刷新', '面板更新'],
      },
      {
        title: '查看角色面板列表',
        desc: '查看已保存的角色面板列表',
        needCK: false,
        needSK: false,
        commands: ['面板', '面板列表'],
      },
      {
        title: '查看角色面板',
        desc: '查看角色详细面板信息',
        needCK: false,
        needSK: false,
        commands: ['角色名+面板'],
      },
      {
        title: '练度统计',
        desc: '查看角色练度统计（如果更新需要先%刷新面板）',
        needCK: false,
        needSK: false,
        commands: ['练度', '练度统计'],
      },
    ],
  },
  {
    title: '式舆防卫战',
    icon: 'dungeon',
    items: [
      {
        title: '查看式舆防卫战',
        desc: '查看式舆防卫战(深渊)信息',
        needCK: false,
        needSK: false,
        commands: ['式舆防卫战', '防卫战', '式舆', '深渊', '防卫'],
      },
      {
        title: '查看上期式舆防卫战',
        desc: '查看上期式舆防卫战(深渊)信息',
        needCK: false,
        needSK: false,
        commands: [
          '上期式舆防卫战',
          '上期防卫战',
          '上期式舆',
          '上期深渊',
          '上期防卫',
        ],
      },
    ],
  },
  {
    title: '角色攻略',
    icon: 'physdmg',
    items: [
      {
        title: '查看角色攻略',
        desc: '查看角色攻略，后面可以加0~7查看不同来源的攻略，其中0或者all为攻略合集',
        needCK: false,
        needSK: false,
        commands: ['角色名+攻略[+0~7]'],
      },
      {
        title: '更新角色攻略',
        desc: '当需要更新某个角色的攻略，或者某个角色攻略出现错误对不上时，可以使用此命令更新攻略',
        needCK: false,
        needSK: false,
        commands: ['更新+角色名+攻略[+0~7]'],
      },
    ],
  },
];
export class Help extends ZZZPlugin {
  constructor() {
    super({
      name: '[ZZZ-Plugin]Help',
      dsc: 'zzzhelp',
      event: 'message',
      priority: _.get(settings.getConfig('priority'), 'help', 70),
      rule: [
        {
          reg: `${rulePrefix}(帮助|help)$`,
          fnc: 'help',
        },
      ],
    });
  }
  async help() {
    if (this.e?.isMaster) {
      const _helpData = [
        ...helpData,
        {
          title: '管理功能',
          icon: 'dungeon',
          items: [
            {
              title: '更新',
              desc: '更新绝区零插件',
              needCK: false,
              needSK: false,
              commands: ['[插件][强制]更新'],
            },
            {
              title: '下载资源',
              desc: '提前下载插件所需资源，查询时无需再次下载',
              needCK: false,
              needSK: false,
              commands: ['下载全部/所有资源'],
            },
            {
              title: '删除资源（需注意）',
              desc: '请注意，此命令会删除自定义面板图，请确认做好备份后再执行！！！删除已经下载的资源，查询时需要再次下载（用于删除错误下载缓存）。',
              needCK: false,
              needSK: false,
              commands: ['删除全部/所有资源'],
            },
            {
              title: '设置默认攻略',
              desc: '设置查询的默认攻略来源，数字0~7对应不同的攻略来源，其中0或者all为攻略合集',
              needCK: false,
              needSK: false,
              commands: ['设置默认攻略+0~7'],
            },
            {
              title: '设置所有攻略显示个数',
              desc: '当查询攻略为0或者all时，设置发送的攻略个数，最大为7',
              needCK: false,
              needSK: false,
              commands: ['设置所有攻略显示个数+1~7'],
            },
            {
              title: '设置渲染精度',
              desc: '设置插件的渲染精度，可选值50~200，建议100',
              needCK: false,
              needSK: false,
              commands: ['设置渲染精度+50~200'],
            },
            {
              title: '刷新抽卡间隔',
              desc: '设置刷新抽卡记录的冷却时间，单位为秒，取值范围为0～1000',
              needCK: false,
              needSK: false,
              commands: ['刷新抽卡间隔+0~1000'],
            },
            {
              title: '刷新面板间隔',
              desc: '设置刷新面板的冷却时间，单位为秒，取值范围为0～1000',
              needCK: false,
              needSK: false,
              commands: ['刷新面板间隔+0~1000'],
            },
            {
              title: '添加角色别名',
              desc: '添加角色别名，方便查询角色信息',
              needCK: false,
              needSK: false,
              commands: ['添加+角色名+别名+角色别名'],
            },
            {
              title: '删除角色别名',
              desc: '删除角色别名',
              needCK: false,
              needSK: false,
              commands: ['删除别名+角色别名'],
            },
            {
              title: '上传角色面板图',
              desc: '上传自定义角色面板图，可以随消息附带图片，可以通过引用消息中的图片上传',
              needCK: false,
              needSK: false,
              commands: [
                '上传+角色名+面板图',
                '上传+角色名+角色图',
                '添加+角色名+面板图',
                '添加+角色名+角色图',
              ],
            },
            {
              title: '查看角色面板图',
              desc: '查看自定义角色面板图，在添加或者删除角色图后，会导致角色图的ID发生变化，此时需要重新获取图片列表来查看ID，否则可能会删除错误的图片',
              needCK: false,
              needSK: false,
              commands: [
                '查看+角色名+面板图[+页码]',
                '查看+角色名+角色图[+页码]',
                '获取+角色名+面板图[+页码]',
                '获取+角色名+角色图[+页码]',
              ],
            },
            {
              title: '删除角色面板图',
              desc: '删除自定义角色面板图，在添加或者删除角色图后，会导致角色图的ID发生变化，此时需要重新获取图片列表来查看ID，否则可能会删除错误的图片',
              needCK: false,
              needSK: false,
              commands: ['删除+角色名+面板图', '删除+角色名+角色图'],
            },
          ],
        },
      ];
      await render(this.e, 'help/index.html', {
        helpData: _helpData,
      });
      return false;
    }
    await render(this.e, 'help/index.html', {
      helpData,
    });
    return false;
  }
}
