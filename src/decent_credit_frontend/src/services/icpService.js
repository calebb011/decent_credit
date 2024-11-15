import { Actor, HttpAgent } from "@dfinity/agent";

// Constants
const DFX_HOST = "http://127.0.0.1:4943";
const CANISTER_ID = "bkyz2-fmaaa-aaaaa-qaaaq-cai";

const agent = new HttpAgent({
  host: DFX_HOST,
  retryTimes: 3,
  fetchOptions: { timeout: 30000 }
});

// Actor creation
export async function createActor() {
  try {
    if (process.env.NODE_ENV !== "production") {
      await agent.fetchRootKey();
    }

    return Actor.createActor(({ IDL }) => {
      const Institution = IDL.Record({
        'id': IDL.Principal,
        'name': IDL.Text,
        'fullName': IDL.Text,
        'status': IDL.Variant({
          'active': IDL.Null,
          'inactive': IDL.Null
        }),
        'joinTime': IDL.Nat64,
        'lastActive': IDL.Nat64,
        'apiCalls': IDL.Nat64,
        'dccConsumed': IDL.Nat64,
        'dataUploads': IDL.Nat64,
        'creditScore': IDL.Nat64,
        'tokenTrading': IDL.Record({
          'bought': IDL.Nat64,
          'sold': IDL.Nat64
        })
      });

      return IDL.Service({
        'register_institution': IDL.Func([IDL.Text, IDL.Text], [IDL.Principal], ['update']),
        'get_institution': IDL.Func([IDL.Principal], [IDL.Opt(Institution)], ['query']),
        'get_all_institutions': IDL.Func([], [IDL.Vec(Institution)], ['query']),
        'update_institution_status': IDL.Func([IDL.Principal, IDL.Bool], [], ['update']),
        'update_credit_score': IDL.Func([IDL.Principal, IDL.Nat64], [], ['update']),
        'record_api_call': IDL.Func([IDL.Principal, IDL.Nat64], [], ['update']),
        'record_data_upload': IDL.Func([IDL.Principal, IDL.Nat64], [], ['update']),
        'record_token_trading': IDL.Func([IDL.Principal, IDL.Bool, IDL.Nat64], [], ['update'])
      });
    }, {
      agent,
      canisterId: CANISTER_ID
    });
  } catch (error) {
    console.error("Error creating actor:", error);
    throw error;
  }
}

// Institution management functions
export async function registerInstitution(name, fullName) {
  const actor = await createActor();
  return actor.register_institution(name, fullName);
}

export async function getAllInstitutions() {
  const actor = await createActor();
  const institutions = await actor.get_all_institutions();
  return institutions.map(formatInstitution);
}

export async function getInstitution(id) {
  const actor = await createActor();
  const institution = await actor.get_institution(id);
  return institution.map(formatInstitution)[0];
}

export async function updateInstitutionStatus(id, isActive) {
  const actor = await createActor();
  return actor.update_institution_status(id, isActive);
}

// Token related functions
export async function buyDCC({ amount }) {
  const actor = await createActor();
  try {
    await actor.record_token_trading(Principal.fromText(account), true, amount);
    return {
      success: true,
      message: "购买成功"
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

export async function sellDCC({ amount }) {
  const actor = await createActor();
  try {
    await actor.record_token_trading(Principal.fromText(account), false, amount);
    return {
      success: true,
      message: "卖出成功"
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

export async function getBalance() {
  const actor = await createActor();
  try {
    const institution = await getInstitution(account);
    return {
      success: true,
      data: {
        dcc: institution.tokenTrading.bought - institution.tokenTrading.sold
      }
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// Helper function
function formatInstitution(raw) {
  return {
    id: raw.id.toText(),
    name: raw.name,
    fullName: raw.fullName,
    status: raw.status.active ? 'active' : 'inactive',
    joinTime: new Date(Number(raw.joinTime)).toISOString(),
    lastActive: new Date(Number(raw.lastActive)).toISOString(),
    apiCalls: Number(raw.apiCalls),
    dccConsumed: Number(raw.dccConsumed),
    dataUploads: Number(raw.dataUploads),
    creditScore: Number(raw.creditScore),
    tokenTrading: {
      bought: Number(raw.tokenTrading.bought),
      sold: Number(raw.tokenTrading.sold)
    }
  };
}

// export {
//   DFX_HOST,
//   CANISTER_ID,
//   registerInstitution,
//   getAllInstitutions,
//   updateInstitutionStatus,
//   buyDCC,
//   sellDCC,
//   getBalance
// };