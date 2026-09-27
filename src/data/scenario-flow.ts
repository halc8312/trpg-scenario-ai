import { Flow } from '@/lib/flow/flow-engine'

export const trpgScenarioFlow: Flow = {
  id: 'trpg-scenario-flow',
  name: 'TRPGシナリオ生成フロー',
  description: '真相から逆算してNPC・手がかり・シーンを組み立て、構造検証・修復・内容チェックまで行うフロー',
  steps: [
    {
      id: 'design-concept',
      name: 'コンセプトと真相の設計',
      type: 'analyze',
      input: ['request'],
      output: ['overview', 'truth'],
      action: '依頼内容からシナリオの概要・導入・真相・PLが到達すべき重要情報を設計',
      nextSteps: ['create-npcs']
    },
    {
      id: 'create-npcs',
      name: 'NPCの作成',
      type: 'write',
      input: ['request', 'overview', 'truth'],
      output: ['npcs'],
      action: '真相の断片を知るNPCを、動機・秘密・台詞例・データ付きで作成',
      nextSteps: ['design-locations-clues']
    },
    {
      id: 'design-locations-clues',
      name: '探索場所と手がかりの設計',
      type: 'write',
      input: ['request', 'truth', 'npcs'],
      output: ['locations', 'clues'],
      action: '重要情報ごとに複数の入手経路を持つ手がかりを場所・NPCに配置',
      nextSteps: ['structure-scenes']
    },
    {
      id: 'structure-scenes',
      name: 'シーン構成',
      type: 'write',
      input: ['request', 'overview', 'truth', 'npcs', 'locations', 'clues'],
      output: ['scenes'],
      action: '導入からクライマックスまでのシーン、判定、戦闘、遷移を構成',
      nextSteps: ['design-endings']
    },
    {
      id: 'design-endings',
      name: 'エンディングと運営ガイド',
      type: 'write',
      input: ['request', 'truth', 'scenes'],
      output: ['endings', 'gmGuide'],
      action: 'PLの行動で分岐するエンディングと、時間配分・救済策などの運営ガイドを作成',
      nextSteps: ['create-pregens']
    },
    {
      id: 'create-pregens',
      name: 'サンプルキャラクター',
      type: 'write',
      input: ['request', 'overview', 'truth', 'npcs'],
      output: ['pregens'],
      action: 'プレイヤー人数分の配布用キャラクターを、導入への関わりとデータ付きで作成',
      conditions: [
        {
          field: 'request.includePregens',
          operator: 'equals',
          value: true
        }
      ],
      nextSteps: ['validate-structure']
    },
    {
      id: 'validate-structure',
      name: '構造の検証',
      type: 'validate',
      input: ['truth', 'npcs', 'locations', 'clues', 'scenes', 'endings'],
      output: ['validation'],
      action: '手がかりの冗長性・参照整合性・シーン遷移を検証',
      nextSteps: ['repair-clues']
    },
    {
      id: 'repair-clues',
      name: '手がかりの補強',
      type: 'update',
      input: ['validation', 'truth', 'clues', 'scenes'],
      output: ['clues', 'scenes'],
      action: '手がかりが不足している重要情報に、別ルートの手がかりを追加',
      conditions: [
        {
          field: 'validation.needsRepair',
          operator: 'equals',
          value: true
        }
      ],
      nextSteps: ['finalize']
    },
    {
      id: 'finalize',
      name: '最終検証',
      type: 'validate',
      input: ['truth', 'npcs', 'locations', 'clues', 'scenes', 'endings'],
      output: ['validation'],
      action: '補強後のシナリオを再検証してスコアを確定',
      nextSteps: ['review-content']
    },
    {
      id: 'review-content',
      name: '内容の矛盾チェック',
      type: 'validate',
      input: ['request', 'truth', 'npcs', 'locations', 'clues', 'scenes', 'endings'],
      output: ['review'],
      action: 'AIがシナリオ全体を読み、真相と手がかりの食い違い・時系列・NPCの言動・ルールの書き方の問題を指摘',
      nextSteps: []
    }
  ]
}
